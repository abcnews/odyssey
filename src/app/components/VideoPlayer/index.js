// External
const html = require('bel');
const playInline = require('iphone-inline-video');
const raf = require('raf');
const url2cmid = require('util-url2cmid');
const xhr = require('xhr');

// Ours
const {CSS_URL, IS_IOS, MQ, MS_VERSION} = require('../../../constants');
const {append, isElement, proximityCheck, $, $$, setText, toggleAttribute, twoDigits} = require('../../../utils');
const {getMeta} = require('../../meta');
const {enqueue, invalidateClient, subscribe} = require('../../scheduler');

const API_URL_ROOT = 'https://content-gateway.abc-prod.net.au/api/v2/content/id/';
const AMBIENT_PLAYABLE_RANGE = .5;

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

  const videoEl = html`<video
    poster="${posterURL ? posterURL : ''}"
    preload="none"
    tabindex="-1"></video>`;

  const booleanAttributes = {
    loop: isLoop,
    muted: isMuted,
    playsinline: true,
    'webkit-playsinline': true
  };

  Object.keys(booleanAttributes)
  .forEach(attributeName => {
    toggleAttribute(videoEl, attributeName, booleanAttributes[attributeName]);
  });

  if (isMuted && !videoEl.muted) {
    // Firefox doesn't respect the muted attribute initially.
    videoEl.muted = true;
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

  let timeRemainingEl;
  let progressBarEl;

  if (!isAmbient) {
    timeRemainingEl = html`<time class="VideoPlayer-timeRemaining"></time>`;
    progressBarEl = html`<progress class="VideoPlayer-progressBar" value="0"></progress>`;
  }
  
  const player = {
    videoEl,
    isAmbient,
    isScrollplay,
    scrollplayPct,
    getRect: () => {
      // Fixed players should use their parent's rect, as they're always in the viewport
      const position = window.getComputedStyle(playerEl).position;
      const el = (position === 'fixed' ? playerEl.parentElement : playerEl);

      return el.getBoundingClientRect();
    },
    toggleMute: event => {
      event.stopPropagation();
      player.isUserInControl = true;
      videoEl.muted = !videoEl.muted;
      toggleAttribute(videoEl, 'muted', videoEl.muted);
    },
    togglePlay: (event, wasScrollBased) => {
      const wasPaused = videoEl.paused;
      
      if (!wasScrollBased && !player.isAmbient) {
        player.isUserInControl = true;
        
        if (wasPaused) {
          players
          .forEach(_player => {
            if (
              _player !== player &&
              !_player.isAmbient &&
              !_player.videoEl.paused
            ) {
              otherVideoEl.pause();
              otherVideoEl.removeAttribute('playing');
            }
          });
        }
      }

      const attrToggle = toggleAttribute.bind(null, videoEl, 'playing', wasPaused);
      const promise = videoEl[wasPaused ? 'play' : 'pause']();

      if (promise) {
        promise.then(attrToggle);
      } else {
        attrToggle();
      }

      setTimeout(() => {
        videoEl.removeAttribute('ended');
      }, 300);
    },
    updatePlaybackPosition: () => {
      const secondsRemaining = videoEl.duration - videoEl.currentTime;
      const progress = videoEl.currentTime / videoEl.duration;

      setText(timeRemainingEl, isNaN(secondsRemaining) ? '' : `${
        secondsRemaining > 0 ? '-' : ''
      }${
        twoDigits(Math.floor(secondsRemaining / 60))
      }:${
        twoDigits(Math.round(secondsRemaining % 60))
      }`);

      progressBarEl.setAttribute('value', progress);

      player.previousTime = Math.floor(videoEl.currentTime);
    }
  };

  players.push(player);

  if (!isAmbient) {
    setInterval(() => {
      if (videoEl.readyState > 0 && Math.floor(videoEl.currentTime) !== player.previousTime) {
        player.updatePlaybackPosition();
      }
    }, 1000);
  }

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
    videoEl.currentTime = 0;
    videoEl.removeAttribute('playing', '');
    videoEl.setAttribute('ended', '');
  });

  const playerEl = html`
    <div class="VideoPlayer">
      <div class="u-sizer-sm-16x9 u-sizer-md-16x9 u-sizer-lg-16x9"></div>
      ${videoEl}
      ${isAmbient ? null : html`
        <div role="button"
          class="VideoPlayer-interface"
          tabindex="0"
          onkeydown=${whenActionKey(event => event.preventDefault())}
          onkeyup=${whenActionKey(player.togglePlay)}
          onclick=${player.togglePlay}>
          <button
            class="VideoPlayer-mute"
            title="Mute control"
            onkeyup=${whenActionKey(event => event.stopPropagation())}
            onclick=${player.toggleMute}></button>
          <div class="VideoPlayer-progress">
            ${progressBarEl}
            ${timeRemainingEl}
          </div>
        </div>
      `}
    </div>
  `;

  return playerEl;
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
        player.togglePlay(null, true);
      })
    }

    player.isInPlayableRange = isInPlayableRange;
  });
});

module.exports = VideoPlayer;
module.exports.UnpublishedVideoPlaceholder = UnpublishedVideoPlaceholder;
module.exports.getMetadata = getMetadata;
