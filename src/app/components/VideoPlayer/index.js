// External
const html = require('bel');

// Ours
const { MQ, MS_VERSION, ONLY_RATIO_PATTERN, SMALLEST_IMAGE } = require('../../../constants');
const { getNextUntitledMediaCharCode, registerPlayer, forEachPlayer } = require('../../media');
const { enqueue, invalidateClient, subscribe } = require('../../scheduler');
const { toggleAttribute, toggleBooleanAttributes } = require('../../utils/dom');
const { PLACEHOLDER_PROPERTY, resize } = require('../Picture');
const { blurImage } = require('../Picture/blur');
const Sizer = require('../Sizer');
const VideoControls = require('../VideoControls');
const { trackProgress } = require('./stats');
const { getMetadata, hasAudio } = require('./utils');
require('./index.scss');

const FUZZY_INCREMENT_FPS = 30;
const FUZZY_INCREMENT_INTERVAL = 1000 / FUZZY_INCREMENT_FPS;
const DEFAULT_RATIO = '16x9';

function VideoPlayer({
  videoId,
  ratios = {},
  title,
  isAmbient,
  isContained,
  isInvariablyAmbient,
  isLoop,
  isMuted,
  scrollplayPct
}) {
  let videoPlayerEl;
  let videoControlsEl;
  let fuzzyCurrentTime = 0;
  let fuzzyTimeout;

  ratios = {
    sm: ONLY_RATIO_PATTERN.test(ratios.sm) ? ratios.sm : DEFAULT_RATIO,
    md: ONLY_RATIO_PATTERN.test(ratios.md) ? ratios.md : DEFAULT_RATIO,
    lg: ONLY_RATIO_PATTERN.test(ratios.lg) ? ratios.lg : DEFAULT_RATIO,
    xl: ONLY_RATIO_PATTERN.test(ratios.xl) ? ratios.xl : DEFAULT_RATIO
  };

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

  const videoEl = html`
    <video preload="none" tabindex="-1" aria-label="${title}"></video>
  `;

  const isInitiallySmallViewport = window.matchMedia(MQ.SM).matches;
  const initiallyPreferredRatio = ratios[isInitiallySmallViewport ? 'sm' : 'lg'];
  const [initiallyPreferredRatioNumerator, initiallyPreferredRatioDenominator] = initiallyPreferredRatio
    .split('x')
    .map(x => parseInt(x, 10));
  const isInitiallyPreferredPortraitContainer =
    initiallyPreferredRatioNumerator / initiallyPreferredRatioDenominator <= 1;

  toggleBooleanAttributes(videoEl, {
    loop: isLoop,
    muted: isMuted,
    paused: true,
    playsinline: true,
    'webkit-playsinline': true
  });

  // Firefox doesn't respect the muted attribute initially.
  if (isMuted && !videoEl.muted) {
    videoEl.muted = true;
  }

  function nextFuzzyIncrement() {
    if (!videoControlsEl || videoEl.paused || !videoEl.duration) {
      return;
    }

    fuzzyCurrentTime = (fuzzyCurrentTime + FUZZY_INCREMENT_INTERVAL / 1000) % videoEl.duration;
    videoControlsEl.api.setProgress((fuzzyCurrentTime / videoEl.duration) * 100);
    clearTimeout(fuzzyTimeout);
    fuzzyTimeout = setTimeout(nextFuzzyIncrement, FUZZY_INCREMENT_INTERVAL);
  }

  videoEl.addEventListener('timeupdate', () => {
    fuzzyCurrentTime = videoEl.currentTime;
  });

  videoEl.addEventListener('playing', () => {
    if (videoControlsEl && videoControlsEl.api.isScrubbing()) {
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
      videoControlsEl.api.setPlaybackLabel('Pause');
    }

    // Incrememnt fuzzy time
    nextFuzzyIncrement();
  });

  videoEl.addEventListener('pause', () => {
    clearTimeout(fuzzyTimeout);

    if (videoControlsEl && videoControlsEl.api.isScrubbing()) {
      return;
    }

    videoEl.setAttribute('paused', '');

    if (videoControlsEl) {
      videoControlsEl.api.setPlaybackLabel('Play');
    }
  });

  videoEl.addEventListener('play', nextFuzzyIncrement);
  videoEl.addEventListener('stalled', clearTimeout(fuzzyTimeout));
  videoEl.addEventListener('waiting', clearTimeout(fuzzyTimeout));

  videoEl.addEventListener('canplay', () => {
    if (hasAudio(videoEl)) {
      videoEl.classList.add('has-audio');
    }
  });

  videoEl.addEventListener('ended', () => {
    if (MS_VERSION === 11) {
      // IE11 mistakenly loops videos
      videoEl.pause();
    }

    player.isUserInControl = true;
    videoEl.setAttribute('ended', '');
    videoEl.setAttribute('paused', '');

    if (videoControlsEl) {
      videoControlsEl.api.setPlaybackLabel('Replay');
    }
  });

  const player = {
    hasNativeUI: false,
    isAmbient,
    isScrollplay,
    scrollplayPct,
    getTitle: () => title,
    getRect: () => {
      // Fixed players should use their parent's rect, as they're always in the viewport
      const position = window.getComputedStyle(videoPlayerEl).position;
      const el = position === 'fixed' ? videoPlayerEl.parentElement : videoPlayerEl;

      return el.getBoundingClientRect();
    },
    getVideoEl: () => videoEl,
    isMuted: () => videoEl.muted,
    setMuted: shouldBeMuted => {
      player.isUserInControl = true;
      videoEl.muted = shouldBeMuted;
      toggleAttribute(videoEl, 'muted', shouldBeMuted);

      if (videoControlsEl) {
        videoControlsEl.api.setMuteLabel(shouldBeMuted ? 'Unmute' : 'Mute');
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
    togglePlayback: (event, wasScrollBased) => {
      if (!wasScrollBased && !player.isAmbient) {
        player.isUserInControl = true;
      }

      player[videoEl.paused ? 'play' : 'pause']();
    },
    jumpToPct: pct => jumpTo(pct * videoEl.duration),
    jumpBy: time => jumpTo(videoEl.currentTime + time)
  };

  getMetadata(videoId, (err, metadata) => {
    if (err) {
      return;
    }

    const { alternativeText, posterURL } = metadata;
    let { sources } = metadata;

    if (alternativeText) {
      player.alternativeText = alternativeText;
    }

    if (posterURL) {
      videoEl.poster = SMALLEST_IMAGE;
      videoEl.style.backgroundImage = `url("${resize({
        url: posterURL,
        size: 'sm',
        ratio: initiallyPreferredRatio
      })}")`;

      if (isContained) {
        enqueue(function _createAndAddPlaceholderImage() {
          blurImage(posterURL, (err, blurredImageURL) => {
            if (err) {
              return;
            }

            placeholderEl.style.setProperty(PLACEHOLDER_PROPERTY, `url("${blurredImageURL}")`);
          });
        });
      }
    }

    sources.sort((a, b) => a.size - b.size);

    const [portraitSources, landscapeSources] = sources.reduce(
      // 1x1 is considered portrait
      (memo, source) => (memo[+(source.width > source.height)].push(source), memo),
      [[], []]
    );

    sources =
      isInitiallyPreferredPortraitContainer && portraitSources.length
        ? portraitSources
        : landscapeSources.length
        ? landscapeSources
        : sources;

    const source = sources[isInitiallySmallViewport ? 0 : sources.length - 1];

    if (source) {
      videoEl.src = source.src;
    }

    registerPlayer(player);
    invalidateClient();

    if (player.metadataHook) {
      player.metadataHook(metadata);
    }
  });

  videoControlsEl = VideoControls(player, isAmbient);

  function jumpTo(time) {
    if (isNaN(videoEl.duration) || videoEl.duration === videoEl.currentTime) {
      return;
    }

    videoEl.currentTime = Math.max(Math.min(time, videoEl.duration - 0.01), 0);
    fuzzyCurrentTime = videoEl.currentTime;

    if (videoControlsEl) {
      videoControlsEl.api.setProgress((videoEl.currentTime / videoEl.duration) * 100);
    }
  }

  if (!isAmbient) {
    videoEl.addEventListener('timeupdate', () => {
      if (videoEl.readyState > 0) {
        videoControlsEl.api.setTimeRemaining(videoEl.duration - videoEl.currentTime);
      }
    });

    updateUI(player);

    trackProgress(videoId, videoEl);
  }

  videoPlayerEl = html`
    <div class="VideoPlayer${isContained ? ' is-contained' : ''}">
      ${placeholderEl} ${videoEl} ${isAmbient ? null : videoControlsEl}
    </div>
  `;

  videoPlayerEl.api = player;

  return videoPlayerEl;
}

function toggleMutePreference(event) {
  event.stopPropagation();

  const controlsEl = this.parentElement;
  const controlledPlayer = controlsEl.parentElement.api;
  const shouldBeMuted = !controlsEl.previousElementSibling.muted;

  forEachPlayer(player => {
    // We can't potentially unmute an ambient or other scroll-based video as
    // browsers won't allow them to play without a user click event
    if (player.isAmbient || (player.isScrollplay && controlledPlayer !== player)) {
      return;
    }

    player.setMuted(shouldBeMuted);
  });
}

const mql = window.matchMedia('(max-height: 30rem)');
let mqlDidMatch = mql.matches;

function updateUI(player) {
  const shouldBeNative = mql.matches;

  player.hasNativeUI = shouldBeNative;

  toggleBooleanAttributes(player.getVideoEl(), {
    controls: shouldBeNative,
    playsinline: !shouldBeNative,
    'webkit-playsinline': !shouldBeNative
  });
}

subscribe(function _checkIfVideoPlayersNeedToUpdateUIBasedOnMedia() {
  if (mqlDidMatch === mql.matches) {
    return;
  }

  mqlDidMatch = mql.matches;

  forEachPlayer(player => {
    if (player.isAmbient) {
      return;
    }

    const wasPlaying = Boolean(player.paused);

    enqueue(() => {
      updateUI(player, mql.matches);

      enqueue(() => {
        if (wasPlaying && player.getVideoEl().scrollIntoView) {
          player.getVideoEl().scrollIntoView(true);
        }
      });
    });
  });
});

module.exports = VideoPlayer;
