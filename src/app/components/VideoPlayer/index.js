// External
const html = require('bel');
const playInline = require('iphone-inline-video');
const raf = require('raf');
const url2cmid = require('util-url2cmid');
const xhr = require('xhr');

// Ours
const {CSS_URL, IS_IOS, MQ, MS_VERSION, SMALLEST_IMAGE} = require('../../../constants');
const {append, isElement, proximityCheck, $, $$, setText,
  toggleAttribute, toggleBooleanAttributes, twoDigits} = require('../../../utils');
const {getMeta} = require('../../meta');
const {enqueue, invalidateClient, subscribe} = require('../../scheduler');

const API_URL_ROOT = 'https://api.abc.net.au/cgapi/api/v2/content/id/';
const API_HEADERS = {'x-api-key': '***REMOVED***'};
const AMBIENT_PLAYABLE_RANGE = .5;
const FUZZY_INCREMENT_FPS = 30;
const FUZZY_INCREMENT_INTERVAL = 1000 / FUZZY_INCREMENT_FPS;

const players = [];
let phase1InlineVideoConfig;

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

    if (controlsEl) {
      controlsEl.setAttribute('aria-label', 'Replay');
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

        if (controlsEl) {
          controlsEl.setAttribute('aria-label', 'Pause');
        }
      });
    },
    pause: () => {
      if (videoEl.paused) {
        return;
      }
      
      videoEl.pause();
      videoEl.setAttribute('paused', '');

      if (controlsEl) {
        controlsEl.setAttribute('aria-label', 'Play');
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

  let muteEl;
  let timeRemainingEl;
  let progressBarEl;
  let controlsEl = null; 

  if (!isAmbient) {
    muteEl = html`<button
      class="VideoPlayer-mute"
      aria-label="${isMuted ? 'Unmute' : 'Mute'}"
      onkeyup=${whenActionKey(event => event.stopPropagation())}
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
    ></progress>`;
    controlsEl = html`
      <div role="button"
        class="VideoPlayer-interface"
        tabindex="0"
        aria-label="Play"
        onkeydown=${whenActionKey(event => event.preventDefault())}
        onkeyup=${whenActionKey(player.togglePlayback)}
        onclick=${player.togglePlayback}>
        ${muteEl}
        <div class="VideoPlayer-progress">
          ${progressBarEl}
          ${timeRemainingEl}
        </div>
      </div>
    `;

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
  }

  return html`
    <div class="VideoPlayer">
      <div class="u-sizer-sm-16x9 u-sizer-md-16x9 u-sizer-lg-16x9"></div>
      ${videoEl}
      ${controlsEl}
    </div>
  `;
};

function whenActionKey(fn) {
  return function (event) {
     if (event.target === this && (event.keyCode === 32 || event.keyCode === 13)) {
        fn(event);
     }
  };
}

function UnpublishedVideoPlaceholder(title) {
  return html`
    <div class="UnpublishedVideoPlaceholder" title="Video ID: ${title}">
      <div class="u-sizer-sm-16x9 u-sizer-md-16x9 u-sizer-lg-16x9"></div>
      <p>
        Unpublished videos cannot be previewed on the mobile site. Try the
        <a target="_blank" href="${
          window.location.href.replace('/mobile/', '/')
        }">standard site</a>.
      </p>
    </div>
  `;
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
    done(null, {
      posterURL: videoElOrId.poster,
      sources: formatSources($$('source', videoElOrId))
    });
  } else if ('WCMS' in window) {
    // Phase 2
    // * Sources & poster are nested inside global `WCMS` object

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
    // * Sources are nested inside global `inlineVideoData` object
    // * Poster may be inferred from original embed's partial jwplayer transform

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
    // * Video must be published because...
    // * Sources and poster must be fetched from live Content API

    xhr({
      json: true,
      headers: API_HEADERS,
      url: `${API_URL_ROOT}${videoElOrId}`
    }, (err, response, body) => {
      if (err || response.statusCode !== 200) {
        return done(err || new Error(response.statusCode));
      }

      const posterId = (body.relatedItems && body.relatedItems.length > 0) ?
        body.relatedItems[0].id : null;

      done(null, {
        posterURL: posterId ? `/news/image/${posterId}-16x9-940x529.jpg` : null,
        sources: formatSources(body.renditions)
      });
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
module.exports.UnpublishedVideoPlaceholder = UnpublishedVideoPlaceholder;
module.exports.getMetadata = getMetadata;
