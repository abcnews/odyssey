// External
const html = require('bel');
const playInline = require('iphone-inline-video');
const raf = require('raf');
const url2cmid = require('util-url2cmid');
const xhr = require('xhr');

// Ours
const {CSS_URL, IS_IOS, MQ, MS_VERSION, SMALLEST_IMAGE} = require('../../../constants');
const {append, isElement, proximityCheck, $, $$, setText,
  toggleAttribute, toggleBooleanAttributes, twoDigits, whenKeyIn} = require('../../../utils');
const {getMeta} = require('../../meta');
const {enqueue, invalidateClient, subscribe} = require('../../scheduler');

const WHITESPACE_PATTERN = /[\n\r\s]/g;
const AMBIENT_PLAYABLE_RANGE = .5;
const FUZZY_INCREMENT_FPS = 30;
const FUZZY_INCREMENT_INTERVAL = 1000 / FUZZY_INCREMENT_FPS;
const STEP_SECONDS = 5;

const players = [];

function hasAudio(el) {
  return el.mozHasAudio ||
    !!el.webkitAudioDecodedByteCount ||
    !!(el.audioTracks && el.audioTracks.length);
}

function VideoPlayer({
  posterURL,
  sources = [],
  isAmbient,
  isAlwaysHQ,
  isLoop,
  isMuted,
  scrollplayPct
}) {
  if (isAmbient) {
    isLoop = true;
    scrollplayPct = 0;
  }

  const isScrollplay = typeof scrollplayPct === 'number';

  if (isScrollplay) {
    isMuted = true;
  }

  const videoEl = html`<video preload="none" tabindex="-1"></video>`;

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
    videoEl.style.backgroundImage = `url("${posterURL}")`;
  }

  const source = sources[!isAlwaysHQ && sources.length > 1 && window.matchMedia(MQ.SM).matches ? 1 : 0];

  if (source) {
    videoEl.src = source.src;
  }

  // iOS8-9 inline video (muted only)
  if (IS_IOS) {
    raf(() => {
      playInline(videoEl, !isMuted);
    });
  }

  function toggleMute(event) {
    event.stopPropagation();
    player.isUserInControl = true;
    videoEl.muted = !videoEl.muted;
    toggleAttribute(videoEl, 'muted', videoEl.muted);

    if (muteEl) {
      muteEl.setAttribute('aria-label', videoEl.muted ? 'Unmute' : 'Mute');
    }
  };

  let fuzzyCurrentTime = 0;
  let fuzzyTimeout;

  function nextFuzzyIncrement() {
    if (!controlsEl || videoEl.paused || !videoEl.duration) {
      return;
    }

    fuzzyCurrentTime = (fuzzyCurrentTime + FUZZY_INCREMENT_INTERVAL / 1000) % videoEl.duration;
    progressBarEl.value = fuzzyCurrentTime / videoEl.duration * 100;
    clearTimeout(fuzzyTimeout);
    fuzzyTimeout = setTimeout(nextFuzzyIncrement, FUZZY_INCREMENT_INTERVAL);
  }

  videoEl.addEventListener('play', nextFuzzyIncrement);
  videoEl.addEventListener('playing', nextFuzzyIncrement);
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

    if (playbackEl) {
      playbackEl.setAttribute('aria-label', 'Replay');
    }
  });

  const player = {
    isAmbient,
    isScrollplay,
    scrollplayPct,
    getRect: () => {
      // Fixed players should use their parent's rect, as they're always in the viewport
      const playerEl = videoEl.parentElement;
      const position = window.getComputedStyle(playerEl).position;
      const el = (position === 'fixed' ? playerEl.parentElement : playerEl);

      return el.getBoundingClientRect();
    },
    play: () => {
      if (!videoEl.paused) {
        return;
      }
      
      // Stop all other non-ambient videos
      if (!player.isAmbient) {
        players.forEach(_player => {
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

      // Play and update attributes
      (videoEl.play() || {then: x => x()})
      .then(() => {
        videoEl.removeAttribute('paused');

        if (playbackEl) {
          playbackEl.setAttribute('aria-label', 'Pause');
        }
      });
    },
    pause: () => {
      if (videoEl.paused) {
        return;
      }
      
      videoEl.pause();
      videoEl.setAttribute('paused', '');

      if (playbackEl) {
        playbackEl.setAttribute('aria-label', 'Play');
      }
    },
    togglePlayback: (event, wasScrollBased) => {
      if (!wasScrollBased && !player.isAmbient) {
        player.isUserInControl = true;
      }

      player[videoEl.paused ? 'play' : 'pause']();
    }
  };

  players.push(player);

  let playbackEl;
  let muteEl;
  let timeRemainingEl;
  let progressBarEl;
  let progressEl;
  let controlsEl = null;
  let steppingKeysHeldDown = [];
  let wasPlayingBeforeStepping;
  let isScrubbing;
  let wasPlayingBeforeScrubbing;

  function jumpTo(time) {
    if (isNaN(videoEl.duration) || videoEl.duration === videoEl.currentTime) {
      return;
    }

    videoEl.currentTime = Math.max(Math.min(time, videoEl.duration - 0.01), 0);
    fuzzyCurrentTime = videoEl.currentTime;
    progressBarEl.value = videoEl.currentTime / videoEl.duration * 100;
  }

  function steppingKeyDown(event) {
    event.preventDefault();

    if (steppingKeysHeldDown.length === 0) {
      wasPlayingBeforeStepping = !videoEl.paused;

      if (wasPlayingBeforeStepping) {
        videoEl.pause();
      }
    }

    if (steppingKeysHeldDown.indexOf(event.keyCode) < 0) {
      steppingKeysHeldDown.push(event.keyCode);
    }

    if (steppingKeysHeldDown.indexOf(event.keyCode) === steppingKeysHeldDown.length - 1) {
      const isSteppingForwards = event.keyCode === 38 || event.keyCode === 39;
    
      jumpTo(videoEl.currentTime + STEP_SECONDS * (isSteppingForwards ? 1 : -1));
    }
  }

  function steppingKeyUp(event) {
    steppingKeysHeldDown.splice(steppingKeysHeldDown.indexOf(event.keyCode), 1);

    if (steppingKeysHeldDown.length === 0 && wasPlayingBeforeStepping) {
      videoEl.play();
    }
  }

  function scrubStart(event) {
    isScrubbing = true;
    wasPlayingBeforeScrubbing = !videoEl.paused;
    videoEl.pause();
    scrub(event, !!event.touches);
  }

  function scrub(event, isPassive) {
    if (!isScrubbing) {
      return;
    }
    
    if (!isPassive) {
      event.preventDefault();
    }
    
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const rect = progressEl.getBoundingClientRect();

    jumpTo((clientX - rect.left) / rect.width * videoEl.duration);
  }

  function scrubEnd() {
    if (!isScrubbing) {
      return;
    }
        
    if (wasPlayingBeforeScrubbing) {
      videoEl.play();
    }
    
    isScrubbing = false;
  }

  if (!isAmbient) {
    playbackEl = html`<button
      class="VideoPlayer-playback"
      aria-label="Play"
      onkeydown=${whenKeyIn([37, 38, 39, 40], steppingKeyDown)}
      onkeyup=${whenKeyIn([37, 38, 39, 40], steppingKeyUp)}
      onclick=${player.togglePlayback}
    ></button>`;
    muteEl = html`<button
      class="VideoPlayer-mute"
      aria-label="${isMuted ? 'Unmute' : 'Mute'}"
      onclick=${toggleMute}
    ></button>`;
    timeRemainingEl = html`<time
      class="VideoPlayer-timeRemaining"
      aria-label="Time Remaining"
    ></time>`;
    progressBarEl = html`<progress
      class="VideoPlayer-progressBar"
      aria-label="Percentage Complete"
      max="100"
      draggable="false"
    ></progress>`;
    progressEl = html`<div class="VideoPlayer-progress">
      ${progressBarEl}
    </div>`
    controlsEl = html`<div class="VideoPlayer-controls">
      ${playbackEl}
      ${muteEl}
      ${progressEl}
      ${timeRemainingEl}
    </div>`;

    videoEl.addEventListener('timeupdate', () => {
      if (videoEl.readyState > 0) {
        const secondsRemaining = videoEl.duration - videoEl.currentTime;
        const formattedNegativeTimeFromEnd = isNaN(secondsRemaining) ? '' : `${
          secondsRemaining > 0 ? '-' : ''
        }${
          twoDigits(Math.floor(secondsRemaining / 60))
        }:${
          twoDigits(Math.round(secondsRemaining % 60))
        }`;

        setText(timeRemainingEl, formattedNegativeTimeFromEnd);
        player.currentFuzzyTime = videoEl.currentTime;
      }
    });

    progressEl.addEventListener('mousedown', scrubStart);
    progressEl.addEventListener('touchstart', scrubStart, {passive: true});
    document.addEventListener('mousemove', scrub);
    document.addEventListener('touchmove', scrub, {passive: true});
    document.addEventListener('mouseup', scrubEnd);
    document.addEventListener('touchend', scrubEnd);
    document.addEventListener('touchcancel', scrubEnd);
  }

  return html`
    <div class="VideoPlayer">
      <div class="u-sizer-sm-16x9 u-sizer-md-16x9 u-sizer-lg-16x9"></div>
      ${videoEl}
      ${controlsEl}
    </div>
  `;
};

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
    done(null, {
      posterURL: videoElOrId.poster,
      sources: formatSources($$('source', videoElOrId))
    });
  } else if ('WCMS' in window) {
    // Phase 2
    // * Poster & sources are nested inside global `WCMS` object

    Object.keys(WCMS.pluginCache.plugins.videoplayer)
    .some(key => {
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
        const posterEl = $('img, .inline-video', el);

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
    // * Must fetch video detail page...
    // * ...then parse posterURL and sources, based on the page template
    
    xhr({url: `/news/${videoElOrId}`}, (err, response, body) => {
      if (err || response.statusCode !== 200) {
        return done(err || new Error(response.statusCode));
      }

      const doc = (new DOMParser()).parseFromString(body, 'text/html');

      if (body.indexOf('WCMS.pluginCache') > -1) {
        // Phase 2
        // * Poster can be selected from the DOM
        // * Sources can be parsed from JS that would nest them under the global `WCMS` object

        done(null, {
          posterURL: doc.querySelector('.view-inlineMediaPlayer img')
            .getAttribute('src').replace('-thumbnail', '-large'),
          sources: formatSources(JSON.parse(body
            .replace(WHITESPACE_PATTERN, '')
            .match(/"sources":(\[.*\]),"addDownload"/)[1]))
        });
      } else if (body.indexOf('inlineVideoData') > -1) {
        // Phase 1 (Standard)
        // * Poster can be selected from the DOM
        // * Sources can be parsed from JS that would nest them under the global `inlineVideoData` object

        done(null, {
          posterURL: doc.querySelector('.inline-video img').getAttribute('src'),
          sources: formatSources(JSON.parse(body
            .replace(WHITESPACE_PATTERN, '')
            .match(/inlineVideoData\.push\((\[.*\])\)/)[1]
            .replace(/'/g, '"')))
        });
      } else {
        // Phase 1 (Mobile)
        // * Poster & sources can be selected from the DOM

        done(null, {
          posterURL: doc.querySelector('.media video').poster,
          sources: formatSources(doc.querySelectorAll('.media source'))
        });
      }
    });
  }
}

function formatSources(sources, sortProp = 'bitrate') {
  return sources
  .sort((a, b) => +b[sortProp] - +a[sortProp])
  .map(source => ({
    src: source.src || source.url,
    type: source.type || source.contentType
  }));
}

subscribe(function _checkIfVideoPlayersNeedToBeToggled(client) {
  players.forEach(player => {
    if (player.isUserInControl || (!player.isAmbient && !player.isScrollplay)) {
      return;
    }

    const rect = player.getRect();
    const isInPlayableRange = player.isAmbient ?
      proximityCheck(rect, client, AMBIENT_PLAYABLE_RANGE) :
      proximityCheck(rect, client, (player.scrollplayPct || 0) / -100);

    if (
      (typeof player.isInPlayableRange === 'undefined' && isInPlayableRange) ||
      (typeof player.isInPlayableRange !== 'undefined' && isInPlayableRange !== player.isInPlayableRange)
    ) {
      enqueue(function _toggleVideoPlay() {
        player.togglePlayback(null, true);
      })
    }

    player.isInPlayableRange = isInPlayableRange;
  });
});

module.exports = VideoPlayer;
module.exports.getMetadata = getMetadata;
