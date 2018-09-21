// External
const html = require('bel');
const raf = require('raf');

// Ours
const { MQ, MS_VERSION, SMALLEST_IMAGE } = require('../../../constants');
const { getNextUntitledMediaCharCode, registerPlayer, forEachPlayer } = require('../../media');
const { enqueue, subscribe } = require('../../scheduler');
const { toggleAttribute, toggleBooleanAttributes } = require('../../utils/dom');
const { PLACEHOLDER_PROPERTY, resize } = require('../Picture');
const { blurImage } = require('../Picture/blur');
const VideoControls = require('../VideoControls');
const { trackProgress } = require('./stats');
const { getMetadata, getMetadataFromDetailPage, hasAudio } = require('./utils');
require('./index.scss');

const FUZZY_INCREMENT_FPS = 30;
const FUZZY_INCREMENT_INTERVAL = 1000 / FUZZY_INCREMENT_FPS;
const DEFAULT_RATIO = '16x9';

function VideoPlayer({
  posterURL,
  ratios = {},
  sources = [],
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
    sm: ratios.sm || DEFAULT_RATIO,
    md: ratios.md || DEFAULT_RATIO,
    lg: ratios.lg || DEFAULT_RATIO
  };

  if (isInvariablyAmbient) {
    isAmbient = true;
  }

  if (isAmbient) {
    isLoop = true;
    scrollplayPct = 0;
  }

  const isScrollplay = typeof scrollplayPct === 'number';

  if (isScrollplay) {
    isMuted = true;
  }

  if (!title) {
    title = String.fromCharCode(getNextUntitledMediaCharCode());
  }

  const placeholderEl = html`
    <div class="u-sizer-sm-${ratios.sm} u-sizer-md-${ratios.md} u-sizer-lg-${ratios.lg}"></div>
  `;
  const videoEl = html`<video preload="none" tabindex="-1" aria-label="${title}"></video>`;

  const isInitiallySmallViewport = window.matchMedia(MQ.SM).matches;

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

  if (posterURL) {
    videoEl.poster = SMALLEST_IMAGE;
    // Pick the aspect ratio based on config and the current viewport
    // size (similar to how the video source is chosen below).
    // Eventually, we'd like to update both of these as the viewport
    // changes, but it's not a priority right now.
    videoEl.style.backgroundImage = `url("${resize({
      url: posterURL,
      ratio: ratios[isInitiallySmallViewport ? 'sm' : 'md']
    })}")`;
  }

  // If we're on mobile, and have more than one high resolution source, use the second
  // highest; otherwise, use the first source (of any resolution).
  // Note: Only Phase 1 (Desktop) sources have width/height defined, making it the
  // only template that can differentiate its high resolution sources.
  const highResSources = sources.filter(source => source.width >= 1080).sort((a, b) => {
    // Wide videos should come before squares
    if (a.width > b.width) return -1;
    if (b.width > a.width) return 1;
    return 0;
  });
  const source = (highResSources.length ? highResSources : sources)[
    highResSources.length > 1 && isInitiallySmallViewport ? 1 : 0
  ];

  if (source) {
    videoEl.src = source.src;
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
            videoControlsEl.parentElement && videoPlayerEl.removeChild(videoControlsEl);
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

  registerPlayer(player);

  videoControlsEl = VideoControls(player, isInvariablyAmbient);

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

    trackProgress(videoEl);
  }

  videoPlayerEl = html`
    <div class="VideoPlayer${isContained ? ' is-contained' : ''}">
      ${placeholderEl}
      ${videoEl}
      ${isInvariablyAmbient ? null : videoControlsEl}
    </div>
  `;

  videoPlayerEl.api = player;

  return videoPlayerEl;
}

function toggleMutePreference(event) {
  event.stopPropagation();

  const shouldBeMuted = !this.parentElement.previousElementSibling.muted;

  forEachPlayer(player => {
    // We can't potentially unmute an ambient/scroll-based video as
    // browsers won't allow them to play without a user click event
    if (player.isAmbient || player.isScrollplay) {
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
module.exports.getMetadata = getMetadata;
module.exports.getMetadataFromDetailPage = getMetadataFromDetailPage;
