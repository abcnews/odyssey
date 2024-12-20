// @ts-check
import html from 'nanohtml';
import { MQ, ONLY_RATIO_PATTERN, PLACEHOLDER_IMAGE_CUSTOM_PROPERTY, SMALLEST_IMAGE, UNIT } from '../../constants';
import { enqueue, invalidateClient, subscribe } from '../../scheduler';
import { isVideoElement, toggleAttribute, toggleBooleanAttributes } from '../../utils/dom';
import { blurImage } from '../Picture/blur';
import Sizer from '../Sizer';
import VideoControls from '../VideoControls';
import { getNextUntitledMediaCharCode, registerPlayer, forEachPlayer } from './players';
import { initialiseVideoAnalytics } from './stats';
import { getMetadata, hasAudio } from './utils';
import styles from './index.lazy.scss';

/**
 * @typedef {object} VideoPlayerAPI
 * @prop {boolean} [hasNativeUI]
 * @prop {boolean} [isAmbient]
 * @prop {boolean} isScrollplay
 * @prop {number | undefined} scrollplayPct
 * @prop {boolean} [willPlayAudio]
 * @prop {boolean} [isInPlayableRange]
 * @prop {string} [alternativeText]
 * @prop {() => string} getTitle
 * @prop {() => DOMRect} getRect
 * @prop {() => HTMLVideoElement} [getVideoEl]
 * @prop {() => boolean} isMuted
 * @prop {(shouldBeMuted: boolean) => void} setMuted
 * @prop {(this: HTMLElement, event: PointerEvent) => void} toggleMutePreference
 * @prop {() => boolean} isPaused
 * @prop {() => void} play
 * @prop {() => void} pause
 * @prop {() => void} [resize]
 * @prop {(_event: Event, wasScrollBased: boolean) => void} togglePlayback
 * @prop {boolean} [isUserInControl]
 * @prop {(pct: number) => void} jumpToPct
 * @prop {(time: number) => void} jumpBy
 * @prop {(metadata: import('./utils').VideoMetadata) => void} [metadataHook]
 */

/**
 * @typedef {HTMLElement & {api?: VideoPlayerAPI}} VideoPlayerEl
 */

const FUZZY_INCREMENT_FPS = 30;
const FUZZY_INCREMENT_INTERVAL = 1000 / FUZZY_INCREMENT_FPS;
const DEFAULT_RATIO = '16x9';

let hasSubscribed = false;

/**
 *
 * @param {object} config
 * @param {string|number} config.videoId The ID of the video to display
 * @param {object} [config.ratios] A ratios object
 * @param {string} [config.title] The title of the video
 * @param {boolean} [config.isAmbient] Should the video be displayed as an ambient video
 * @param {boolean} [config.isContained] Should the video be contained
 * @param {boolean} [config.isInvariablyAmbient]
 * @param {boolean} [config.isLoop] Should the video loop?
 * @param {boolean} [config.isMuted] Should the video be muted?
 * @param {number} [config.scrollplayPct] What protion of the video should be visible for play on scroll
 * @param {Element} [config.videoDuration] A <time> element to display the video duration.
 * @returns
 */
const VideoPlayer = ({
  videoId,
  ratios = {},
  title,
  isAmbient,
  isContained,
  isInvariablyAmbient,
  isLoop,
  isMuted,
  videoDuration,
  scrollplayPct
}) => {
  /** @type {VideoPlayerEl} */
  let videoPlayerEl;
  /** @type {import('../VideoControls').VideoControlsEl} */
  let videoControlsEl;
  let fuzzyCurrentTime = 0;
  let fuzzyTimeout;

  ratios = {
    sm: ONLY_RATIO_PATTERN.test(ratios.sm) ? ratios.sm : DEFAULT_RATIO,
    md: ONLY_RATIO_PATTERN.test(ratios.md) ? ratios.md : DEFAULT_RATIO,
    lg: ONLY_RATIO_PATTERN.test(ratios.lg) ? ratios.lg : DEFAULT_RATIO,
    xl: ONLY_RATIO_PATTERN.test(ratios.xl) ? ratios.xl : DEFAULT_RATIO
  };

  isAmbient = !!isAmbient;

  if (isInvariablyAmbient) {
    isAmbient = true;
  }

  if (isAmbient) {
    isLoop = typeof isLoop === 'boolean' ? isLoop : true;
    scrollplayPct = scrollplayPct || 0;
  }

  const isScrollplay = typeof scrollplayPct === 'number';

  if (isScrollplay) {
    isMuted = true;
  }

  if (!title) {
    title = String.fromCharCode(getNextUntitledMediaCharCode());
  }

  const placeholderEl = Sizer(ratios);

  const videoEl = html`<video preload="none" tabindex="-1" aria-label="${title}"></video>`;

  // This is a silly hack for types because nanohtml always returns a HTMLElement regardless of the tag used.
  if (!isVideoElement(videoEl)) return;

  const isInitiallySmallViewport = window.matchMedia(MQ.SM).matches;
  const initiallyPreferredRatio = ratios[isInitiallySmallViewport ? 'sm' : 'lg'];
  const [initiallyPreferredRatioNumerator, initiallyPreferredRatioDenominator] = initiallyPreferredRatio
    .split('x')
    .map(x => parseInt(x, 10));
  const isInitiallyPreferredPortraitContainer =
    initiallyPreferredRatioNumerator / initiallyPreferredRatioDenominator <= 1;

  toggleBooleanAttributes(videoEl, {
    loop: !!isLoop,
    muted: !!isMuted,
    paused: true,
    playsinline: true,
    'webkit-playsinline': true
  });

  // Firefox doesn't respect the muted attribute initially.
  if (isMuted && !videoEl.muted) {
    videoEl.muted = true;
  }

  function nextFuzzyIncrement() {
    // This is a silly hack for types because nanohtml always returns a HTMLElement regardless of the tag used.
    if (!isVideoElement(videoEl)) return;

    if (!videoControlsEl || videoEl.paused || !videoEl.duration) {
      return;
    }

    fuzzyCurrentTime = (fuzzyCurrentTime + FUZZY_INCREMENT_INTERVAL / 1000) % videoEl.duration;
    videoControlsEl.api?.setProgress((fuzzyCurrentTime / videoEl.duration) * 100);
    clearTimeout(fuzzyTimeout);
    fuzzyTimeout = setTimeout(nextFuzzyIncrement, FUZZY_INCREMENT_INTERVAL);
  }

  videoEl.addEventListener('timeupdate', () => {
    fuzzyCurrentTime = videoEl.currentTime;
  });

  videoEl.addEventListener('playing', () => {
    if (videoControlsEl && videoControlsEl.api?.isScrubbing()) {
      return;
    }

    // Stop all other non-ambient videos
    if (!player.isAmbient) {
      forEachPlayer(_player => {
        if (_player !== player && !_player.isAmbient) {
          _player.pause();
        }
      });
    }

    // Reset video if it had ended
    if (videoEl.hasAttribute('ended')) {
      videoEl.removeAttribute('ended');
      videoEl.currentTime = 0;
    }

    // Update attributes
    videoEl.removeAttribute('paused');

    if (videoControlsEl) {
      videoControlsEl.api?.setPlaybackLabel('Pause');
    }

    // Incrememnt fuzzy time
    nextFuzzyIncrement();
  });

  videoEl.addEventListener('pause', () => {
    clearTimeout(fuzzyTimeout);

    if (videoControlsEl && videoControlsEl.api?.isScrubbing()) {
      return;
    }

    videoEl.setAttribute('paused', '');

    if (videoControlsEl) {
      videoControlsEl.api?.setPlaybackLabel('Play');
    }
  });

  videoEl.addEventListener('play', nextFuzzyIncrement);
  videoEl.addEventListener('stalled', () => clearTimeout(fuzzyTimeout));
  videoEl.addEventListener('waiting', () => clearTimeout(fuzzyTimeout));

  videoEl.addEventListener('canplay', () => {
    if (hasAudio(videoEl)) {
      videoEl.classList.add('has-audio');
    }
  });

  videoEl.addEventListener('ended', () => {
    player.isUserInControl = true;
    videoEl.setAttribute('ended', '');
    videoEl.setAttribute('paused', '');

    if (videoControlsEl) {
      videoControlsEl.api?.setPlaybackLabel('Replay');
    }
  });

  /** @type {VideoPlayerAPI} */
  const player = {
    hasNativeUI: false,
    isAmbient,
    isScrollplay,
    scrollplayPct,
    /**
     * Set to `true` by the audio visual plugin to tighten the playback
     * threshold so videos with audio are less likely to overlap
     */
    willPlayAudio: false,
    getTitle: () => title,
    getRect: () => {
      // Fixed players should use their parent's rect, as they're always in the viewport
      const position = window.getComputedStyle(videoPlayerEl).position;
      const el = position === 'fixed' && videoPlayerEl.parentElement ? videoPlayerEl.parentElement : videoPlayerEl;
      return el.getBoundingClientRect();
    },
    getVideoEl: () => videoEl,
    isMuted: () => videoEl.muted,
    setMuted: shouldBeMuted => {
      player.isUserInControl = true;
      videoEl.muted = shouldBeMuted;
      toggleAttribute(videoEl, 'muted', shouldBeMuted);

      if (videoControlsEl) {
        videoControlsEl.api?.setMuteLabel(shouldBeMuted ? 'Unmute' : 'Mute');
      }
    },
    toggleMutePreference: toggleMutePreference,
    isPaused: () => videoEl.paused,
    play: () => {
      if (!videoEl.paused) {
        return;
      }

      const playback = videoEl.play();

      if (isAmbient && !isInvariablyAmbient && playback != null) {
        playback
          .then(() => {
            if (videoControlsEl.parentElement) {
              videoPlayerEl.removeChild(videoControlsEl);
            }
          })
          .catch(err => {
            if (String(err).indexOf('NotAllowedError') === 0) {
              // Browser is blocking non-user-initited playback
              videoPlayerEl.appendChild(videoControlsEl);
            }
          });
      }
    },
    pause: () => {
      if (videoEl.paused) {
        return;
      }

      videoEl.pause();
    },
    togglePlayback: (_event, wasScrollBased) => {
      if (!wasScrollBased && !player.isAmbient) {
        player.isUserInControl = true;
      }

      player[videoEl.paused ? 'play' : 'pause']();
    },
    jumpToPct: pct => jumpTo(pct * videoEl.duration),
    jumpBy: time => jumpTo(videoEl.currentTime + time)
  };

  getMetadata(videoId).then(metadata => {
    const { alternativeText, posterURL, sources } = metadata;

    if (alternativeText) {
      player.alternativeText = alternativeText;
    }

    if (posterURL) {
      videoEl.poster = SMALLEST_IMAGE;
      videoEl.style.backgroundImage = `url("${posterURL}")`;

      if (isContained) {
        enqueue(function _createAndAddPlaceholderImage() {
          blurImage(posterURL, (err, blurredImageURL) => {
            if (err) {
              return;
            }

            placeholderEl.style.setProperty(PLACEHOLDER_IMAGE_CUSTOM_PROPERTY, `url("${blurredImageURL}")`);
          });
        });
      }
    }

    /** @type {[import('./utils').VideoSource[], import('./utils').VideoSource[]]} */
    const initSources = [[], []];
    const [portraitSources, landscapeSources] = sources.reduce(
      // 1x1 is considered portrait
      (memo, source) => (memo[+(source.width > source.height)].push(source), memo),
      initSources
    );
    const candidateSources =
      isInitiallyPreferredPortraitContainer && portraitSources.length
        ? portraitSources
        : landscapeSources.length
        ? landscapeSources
        : sources;
    const source = candidateSources[isInitiallySmallViewport ? 0 : candidateSources.length - 1];

    if (source) {
      videoEl.src = source.url;
    }

    registerPlayer(player);

    if (!hasSubscribed) {
      subscribe(_checkIfVideoPlayersNeedToUpdateUIBasedOnMedia);
      hasSubscribed = true;
    }

    invalidateClient();

    if (player.metadataHook) {
      player.metadataHook(metadata);
    }
  });

  videoControlsEl = VideoControls(player, isAmbient, videoDuration instanceof HTMLElement ? videoDuration : undefined);

  /**
   * Jump to a time on the video
   * @param {number} time The timestamp (in seconds) to jump to on the video
   */
  function jumpTo(time) {
    // This is a silly hack for types because nanohtml always returns a HTMLElement regardless of the tag used.
    if (!isVideoElement(videoEl)) return;

    if (isNaN(videoEl.duration) || videoEl.duration === videoEl.currentTime) {
      return;
    }

    videoEl.currentTime = Math.max(Math.min(time, videoEl.duration - 0.01), 0);
    fuzzyCurrentTime = videoEl.currentTime;

    if (videoControlsEl) {
      videoControlsEl.api?.setProgress((videoEl.currentTime / videoEl.duration) * 100);
    }
  }

  if (!isAmbient) {
    videoEl.addEventListener('timeupdate', () => {
      if (videoEl.readyState > 0) {
        videoControlsEl.api?.setTimeRemaining(videoEl.duration - videoEl.currentTime);
      }
    });

    updateUI(player);

    // Initialise analytics
    initialiseVideoAnalytics(videoId, videoEl);
  }

  videoPlayerEl = html`
    <div class="VideoPlayer${isContained ? ' is-contained' : ''}" draggable="false">
      ${placeholderEl} ${videoEl} ${isAmbient ? null : videoControlsEl}
    </div>
  `;

  videoPlayerEl.api = player;

  styles.use();

  return videoPlayerEl;
};

/**
 * @param {PointerEvent} event
 * @this {HTMLElement}
 */
function toggleMutePreference(event) {
  event.stopPropagation();

  /** @type {import('../VideoControls').VideoControlsEl | null} */
  const controlsEl = this.parentElement;
  if (!controlsEl) return;
  /** @type {VideoPlayerEl | null} */
  const playerEl = controlsEl.parentElement;
  const controlledPlayer = playerEl?.api;
  const videoEl = controlsEl.previousElementSibling;
  if (!isVideoElement(videoEl)) {
    throw new Error('Error selecting video element.');
  }
  const shouldBeMuted = !videoEl.muted;

  forEachPlayer(player => {
    // We can't potentially unmute an ambient or other scroll-based video as
    // browsers won't allow them to play without a user click event
    if (player.isAmbient || (player.isScrollplay && controlledPlayer !== player)) {
      return;
    }

    player.setMuted(shouldBeMuted);
  });
}

export default VideoPlayer;

const mql = window.matchMedia(`(max-height: ${UNIT * 30}px)`);
let mqlDidMatch = mql.matches;

/**
 * Update the UI of a player based on media query
 * @param {VideoPlayerAPI} player
 */
function updateUI(player) {
  const shouldBeNative = mql.matches;

  player.hasNativeUI = shouldBeNative;

  if (player.getVideoEl) {
    toggleBooleanAttributes(player.getVideoEl(), {
      controls: shouldBeNative,
      playsinline: !shouldBeNative,
      'webkit-playsinline': !shouldBeNative
    });
  }
}

function _checkIfVideoPlayersNeedToUpdateUIBasedOnMedia() {
  if (mqlDidMatch === mql.matches) {
    return;
  }

  mqlDidMatch = mql.matches;

  forEachPlayer(player => {
    if (!player.getVideoEl || player.isAmbient) {
      return;
    }

    const wasPlaying = !player.isPaused();

    enqueue(function _updateVideoPlayerUI() {
      updateUI(player);

      if (wasPlaying && player.getVideoEl && player.getVideoEl().scrollIntoView) {
        enqueue(function _scrollVideoPlayerIntoView() {
          if (player.getVideoEl) {
            player.getVideoEl().scrollIntoView(true);
          }
        });
      }
    });
  });
}
