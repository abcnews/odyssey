// External
const html = require('bel');
const playInline = require('iphone-inline-video').default;
const raf = require('raf');
const url2cmid = require('util-url2cmid');
const xhr = require('xhr');

// Ours
const { CSS_URL, IS_IOS, MQ, MS_VERSION, SMALLEST_IMAGE } = require('../../../constants');
const { getNextUntitledMediaCharCode, registerPlayer, forEachPlayer } = require('../../media');
const { getMeta } = require('../../meta');
const { enqueue, subscribe } = require('../../scheduler');
const { $, $$, append, isElement, toggleAttribute, toggleBooleanAttributes } = require('../../utils/dom');
const { resize } = require('../Picture');
const VideoControls = require('../VideoControls');
const { trackProgress } = require('./stats');
require('./index.scss');

const NEWLINES_PATTERN = /[\n\r]/g;
const FUZZY_INCREMENT_FPS = 30;
const FUZZY_INCREMENT_INTERVAL = 1000 / FUZZY_INCREMENT_FPS;
const DEFAULT_RATIO = '16x9';

function hasAudio(el) {
  return el.mozHasAudio || !!el.webkitAudioDecodedByteCount || !!(el.audioTracks && el.audioTracks.length);
}

function VideoPlayer({ posterURL, ratios = {}, sources = [], title, isAmbient, isLoop, isMuted, scrollplayPct }) {
  ratios = {
    sm: ratios.sm || DEFAULT_RATIO,
    md: ratios.md || DEFAULT_RATIO,
    lg: ratios.lg || DEFAULT_RATIO
  };

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

  const videoEl = html`<video preload="none" tabindex="-1" aria-label="${title}"></video>`;

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
    videoEl.style.backgroundImage = `url("${resize({ url: posterURL })}")`;
  }

  // If we're on mobile, and have more than one high resolution source, use the second
  // highest; otherwise, use the first source (of any resolution).
  // Note: Only Phase 1 (Desktop) sources have width/height defined, making it the
  // only template that can differentiate its high resolution sources.
  const highResSources = sources.filter(source => source.width >= 1024);
  const source = (highResSources.length ? highResSources : sources)[
    highResSources.length > 1 && window.matchMedia(MQ.SM).matches ? 1 : 0
  ];

  if (source) {
    videoEl.src = source.src;
  }

  // iOS8-9 inline video (muted only)
  if (IS_IOS) {
    raf(() => {
      playInline(videoEl, !isMuted);
    });
  }

  let fuzzyCurrentTime = 0;
  let fuzzyTimeout;

  function nextFuzzyIncrement() {
    if (!videoControlsEl || videoEl.paused || !videoEl.duration) {
      return;
    }

    fuzzyCurrentTime = (fuzzyCurrentTime + FUZZY_INCREMENT_INTERVAL / 1000) % videoEl.duration;
    videoControlsEl.api.setProgress(fuzzyCurrentTime / videoEl.duration * 100);
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
      const playerEl = videoEl.parentElement;
      const position = window.getComputedStyle(playerEl).position;
      const el = position === 'fixed' ? playerEl.parentElement : playerEl;

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
      videoEl.play();
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

  let videoControlsEl = null;

  function jumpTo(time) {
    if (isNaN(videoEl.duration) || videoEl.duration === videoEl.currentTime) {
      return;
    }

    videoEl.currentTime = Math.max(Math.min(time, videoEl.duration - 0.01), 0);
    fuzzyCurrentTime = videoEl.currentTime;

    if (videoControlsEl) {
      videoControlsEl.api.setProgress(videoEl.currentTime / videoEl.duration * 100);
    }
  }

  if (!isAmbient) {
    videoControlsEl = VideoControls(player);

    videoEl.addEventListener('timeupdate', () => {
      if (videoEl.readyState > 0) {
        // player.currentFuzzyTime = videoEl.currentTime;
        videoControlsEl.api.setTimeRemaining(videoEl.duration - videoEl.currentTime);
      }
    });

    updateUI(player);

    trackProgress(videoEl);
  }

  const videoPlayerEl = html`
    <div class="VideoPlayer">
      <div class="u-sizer-sm-${ratios.sm} u-sizer-md-${ratios.md} u-sizer-lg-${ratios.lg}"></div>
      ${videoEl}
      ${videoControlsEl}
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

function getMetadata(videoElOrId, callback) {
  let wasCalled;

  function done(err, metadata) {
    if (!wasCalled) {
      wasCalled = true;
      raf(() => {
        callback(err, metadata);
      });
    }
  }

  if (isElement(videoElOrId)) {
    if (videoElOrId.className.indexOf('jw-') > -1) {
      // JWPLayer <video> with src attribute and nearby element with poster as a background-image
      done(null, {
        posterURL: (videoElOrId.parentElement.nextElementSibling.style.backgroundImage.match(CSS_URL) || [, ''])[1],
        sources: formatSources([videoElOrId])
      });
    } else {
      // <video> with poster attribute and <source> children
      done(null, {
        posterURL: videoElOrId.poster,
        sources: formatSources($$('source', videoElOrId))
      });
    }
  } else if ('WCMS' in window) {
    // Phase 2
    // * Poster & sources are nested inside global `WCMS` object

    Object.keys(WCMS.pluginCache.plugins.videoplayer).some(key => {
      const config = WCMS.pluginCache.plugins.videoplayer[key][0].videos[0];

      if (config.url.indexOf(videoElOrId) > -1) {
        done(null, {
          posterURL: config.thumbnail.replace('-thumbnail', '-large'),
          sources: formatSources(config.sources, 'label')
        });

        return true;
      }
    });
  } else if ('inlineVideoData' in window) {
    // Phase 1 (Standard)
    // * Poster may be inferred from original embed's partial jwplayer transform
    // * Sources are nested inside global `inlineVideoData` object

    const relatedMedia = getMeta().relatedMedia;

    $$('.inline-content.video[data-inline-video-data-index]')
      .concat(relatedMedia ? [relatedMedia] : [])
      .some(el => {
        if ($(`[href*="/${videoElOrId}"]`, el)) {
          const posterEl = $('img', el) || $('.inline-video, .jwplayer-video', el);

          done(null, {
            posterURL: posterEl ? (posterEl.style.backgroundImage.match(CSS_URL) || [, posterEl.src])[1] : null,
            sources: formatSources(window.inlineVideoData[el.getAttribute('data-inline-video-data-index')])
          });

          return true;
        }
      });
  } else {
    // Phase 1 (Mobile):
    // * Doesn't embed video; only teases to it.
    // * Must fetch video detail page (Phase 1 always fetches from Standard)...
    // * ...then parse posterURL and sources, based on the page template

    xhr(
      { url: `${(window.location.origin || '').replace('mobile', 'www')}/news/${videoElOrId}?pfm=ms` },
      (err, response, body) => {
        if (err || response.statusCode !== 200) {
          return done(err || new Error(response.statusCode));
        }

        const doc = new DOMParser().parseFromString(body, 'text/html');

        if (body.indexOf('WCMS.pluginCache') > -1) {
          // Phase 2
          // * Poster can be selected from the DOM
          // * Sources can be parsed from JS that would nest them under the global `WCMS` object

          return done(null, {
            posterURL: doc
              .querySelector('.view-inlineMediaPlayer img')
              .getAttribute('src')
              .replace('-thumbnail', '-large'),
            sources: formatSources(
              JSON.parse(body.replace(NEWLINES_PATTERN, '').match(/"sources":(\[.*\]),"addDownload"/)[1])
            )
          });
        } else if (body.indexOf('inlineVideoData') > -1) {
          // Phase 1 (Standard)
          // * Poster can be selected from the DOM
          // * Sources can be parsed from JS that would nest them under the global `inlineVideoData` object

          return done(null, {
            posterURL: doc.querySelector('.inline-video img').getAttribute('src'),
            sources: formatSources(
              JSON.parse(
                body
                  .replace(NEWLINES_PATTERN, '')
                  .match(/inlineVideoData\.push\((\[.*\])\)/)[1]
                  .replace(/'/g, '"')
              )
            )
          });
        }

        done(new Error('Unrecognised video detail page template'));
      }
    );
  }
}

function formatSources(sources, sortProp = 'bitrate') {
  return sources.sort((a, b) => +b[sortProp] - +a[sortProp]).map(source => ({
    src: source.src || source.url,
    type: source.type || source.contentType,
    width: +source.width || 0,
    height: +source.height || 0
  }));
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
