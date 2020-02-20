// External
const html = require('bel');

// Ours
const { getNextUntitledMediaCharCode, registerPlayer, forEachPlayer } = require('../../media');
const { enqueue, invalidateClient, subscribe } = require('../../scheduler');
const { toggleAttribute } = require('../../utils/dom');
const { PLACEHOLDER_PROPERTY } = require('../Picture');
const { blurImage } = require('../Picture/blur');
const Sizer = require('../Sizer');
const VideoControls = require('../VideoControls');
require('./index.scss');

const DEFAULT_YOUTUBE_CONFIG = {
  controls: 0,
  disablekb: 1,
  fs: 0,
  iv_load_policy: 3,
  modestbranding: 1,
  playsinline: 1,
  rel: 0,
  showinfo: 0
};
const FUZZY_INCREMENT_FPS = 30;
const FUZZY_INCREMENT_INTERVAL = 1000 / FUZZY_INCREMENT_FPS;
const DEFAULT_RATIO = '16x9';

const players = [];
let nextId = 0;

function YouTubePlayer({
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
  ratios = {
    sm: ratios.sm || DEFAULT_RATIO,
    md: ratios.md || DEFAULT_RATIO,
    lg: ratios.lg || DEFAULT_RATIO,
    xl: ratios.xl || DEFAULT_RATIO
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

  const id = nextId++;
  const posterURL = `https://img.youtube.com/vi/${videoId}/0.jpg`;
  const placeholderEl = Sizer(ratios);
  const posterEl = html`
    <img src="${posterURL}" />
  `;
  let videoEl = html`
    <div id="youtube-video-${id}"></div>
  `;
  let youtube;
  let youTubePlayerEl;
  let videoControlsEl;
  let player;
  let fuzzyCurrentTime = 0;
  let fuzzyTimeout;

  function nextFuzzyIncrement() {
    const duration = youtube.getDuration();

    if (!videoControlsEl || videoEl.hasAttribute('paused') || !duration) {
      return;
    }

    fuzzyCurrentTime = (fuzzyCurrentTime + FUZZY_INCREMENT_INTERVAL / 1000) % duration;
    videoControlsEl.api.setProgress((fuzzyCurrentTime / duration) * 100);
    clearTimeout(fuzzyTimeout);
    fuzzyTimeout = setTimeout(nextFuzzyIncrement, FUZZY_INCREMENT_INTERVAL);
  }

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

  loadYouTubeAPI(YT => {
    youtube = new YT.Player(`youtube-video-${id}`, {
      width: '100%',
      height: '100%',
      videoId,
      playerVars: Object.assign(
        {
          loop: isLoop ? 1 : 0,
          mute: isMuted ? 1 : 0,
          playlist: videoId
        },
        DEFAULT_YOUTUBE_CONFIG
      ),
      events: {
        onReady: () => {
          videoEl = youtube.getIframe();
          videoEl.setAttribute('paused', '');

          if (!isMuted) {
            videoEl.classList.add('has-audio');
          }

          setInterval(() => {
            if (player.isPaused()) {
              return;
            }

            const currentTime = (fuzzyCurrentTime = youtube.getCurrentTime());

            if (!videoControlsEl) {
              return;
            }

            videoControlsEl.api.setTimeRemaining(youtube.getDuration() - currentTime);
          }, 500);

          youtube.setVolume(100);
          youtube.setPlaybackRate(1);

          registerPlayer(player);
          players.push(player);
          player.resize();
          invalidateClient();
        },
        onStateChange: event => {
          switch (event.data) {
            case YT.PlayerState.ENDED:
              player.isUserInControl = true;
              videoEl.setAttribute('ended', '');
              videoEl.setAttribute('paused', '');
              toggleAttribute(videoEl, 'muted', isMuted);

              if (videoControlsEl) {
                videoControlsEl.api.setPlaybackLabel('Replay');
              }

              break;
            case YT.PlayerState.PLAYING:
              if (posterEl.parentElement) {
                youTubePlayerEl.removeChild(posterEl);
              }

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

              if (videoEl.hasAttribute('ended')) {
                videoEl.removeAttribute('ended');
              }

              videoEl.removeAttribute('paused');

              if (videoControlsEl) {
                videoControlsEl.api.setPlaybackLabel('Pause');
              }

              nextFuzzyIncrement();
              break;
            case YT.PlayerState.PAUSED:
              clearTimeout(fuzzyTimeout);

              if (videoControlsEl && videoControlsEl.api.isScrubbing()) {
                return;
              }

              videoEl.setAttribute('paused', '');

              if (videoControlsEl) {
                videoControlsEl.api.setPlaybackLabel('Play');
              }

              break;

            case YT.PlayerState.BUFFERING:
              clearTimeout(fuzzyTimeout);
              break;
            case YT.PlayerState.CUED:
              clearTimeout(fuzzyTimeout);
              break;
            default:
              break;
          }
        }
      }
    });
  });

  player = {
    isAmbient,
    isScrollplay,
    scrollplayPct,
    getTitle: () => title,
    getRect: () => {
      const position = window.getComputedStyle(youTubePlayerEl).position;
      const el = position === 'fixed' ? youTubePlayerEl.parentElement : youTubePlayerEl;

      return el.getBoundingClientRect();
    },
    resize: () => {
      const { width, height } = youTubePlayerEl.getBoundingClientRect();

      videoEl.style.width = `${height * 1.77778}px`;
      videoEl.style.height = `${width * 0.5625}px`;
    },
    isMuted: () => (youtube ? youtube.isMuted() : isMuted),
    setMuted: shouldBeMuted => {
      player.isUserInControl = true;
      toggleAttribute(videoEl, 'muted', shouldBeMuted);
      youtube[shouldBeMuted ? 'mute' : 'unMute']();

      if (videoControlsEl) {
        videoControlsEl.api.setMuteLabel(shouldBeMuted ? 'Unmute' : 'Mute');
      }
    },
    toggleMutePreference: event => {
      event.stopPropagation();

      const shouldBeMuted = !player.isMuted();

      forEachPlayer(_player => {
        if (_player.isAmbient || _player.isScrollplay) {
          return;
        }

        _player.setMuted(shouldBeMuted);
      });
    },
    isPaused: () => youtube.getPlayerState() !== 1,
    play: () => {
      if (youtube.getPlayerState() === 1) {
        return;
      }

      youtube.playVideo();
    },
    pause: () => {
      if (player.isPaused()) {
        return;
      }

      youtube.pauseVideo();
    },
    togglePlayback: (event, wasScrollBased) => {
      if (!wasScrollBased && !player.isAmbient) {
        player.isUserInControl = true;
      }

      youtube[player.isPaused() ? 'playVideo' : 'pauseVideo']();
    },
    jumpToPct: pct => jumpTo(pct * youtube.getDuration()),
    jumpBy: time => jumpTo(youtube.getCurrentTime() + time)
  };

  function jumpTo(time) {
    const duration = youtube.getDuration();
    const currentTime = youtube.getCurrentTime();

    if (duration === currentTime) {
      return;
    }

    youtube.seekTo(Math.max(Math.min(time, duration - 0.01), 0), true);
    fuzzyCurrentTime = time;

    if (videoControlsEl) {
      videoControlsEl.api.setProgress((currentTime / duration) * 100);
    }
  }

  videoControlsEl = VideoControls(player, isAmbient);

  youTubePlayerEl = html`
    <div class="YouTubePlayer${isContained ? ' is-contained' : ''}">
      ${placeholderEl} ${videoEl} ${isAmbient ? null : videoControlsEl} ${posterEl}
    </div>
  `;

  return youTubePlayerEl;
}

subscribe(function _checkIfPlayersNeedToBeResized(client) {
  if (client.hasChanged) {
    players.forEach(player => player.resize());
  }
});

function loadYouTubeAPI(cb) {
  if (window.YT && window.YT.Player && window.YT.Player instanceof Function) {
    requestAnimationFrame(() => cb(window.YT));
  }

  const previous = window.onYouTubeIframeAPIReady;

  window.onYouTubeIframeAPIReady = () => {
    if (previous) {
      previous();
    }

    cb(window.YT);
  };

  const script = document.createElement('script');

  script.async = true;
  script.src = '//www.youtube.com/iframe_api';
  document.head.appendChild(script);
}

module.exports = YouTubePlayer;
