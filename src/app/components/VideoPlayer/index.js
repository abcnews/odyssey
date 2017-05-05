// External
const html = require('bel');
const playInline = require('iphone-inline-video');
const url2cmid = require('util-url2cmid');
const xhr = require('xhr');

// Ours
const {append, selectAll, toggleAttribute, twoDigits} = require('../../../utils');
const {nextFrame, subscribe} = require('../../loop');

const BACKGROUND_IMAGE_PATTERN = /url\(['"]?(.*\.\w*)['"]?\)/;
const API_URL_ROOT = 'https://content-gateway.abc-prod.net.au/api/v1/content/id/';

const players = [];
let phase1InlineVideoConfig;

function VideoPlayer({
  posterURL,
  sources = [],
  isAmbient,
  isAutoplay,
  isFullscreen,
  isLoop,
  isMuted,
  scrollplayPct
}) {
  if (isAmbient) {
    isAutoplay = true;
    isFullscreen = true;
    isLoop = true;
  }

  if (isAutoplay || scrollplayPct) {
    isMuted = true;
  }

  const videoEl = html`<video poster="${posterURL ? posterURL : ''}" preload="${scrollplayPct ? 'auto' : 'none'}"></video>`;

  const booleanAttributes = {
    autoplay: isAutoplay,
    loop: isLoop,
    muted: isMuted,
    playsinline: true,
    scrollplay: !!scrollplayPct,
    'webkit-playsinline': true
  };

  Object.keys(booleanAttributes).forEach(attributeName => {
    toggleAttribute(videoEl, attributeName, booleanAttributes[attributeName]);
  });

  sources.forEach(source => {
    append(videoEl, html`<source src="${source.src}" type="${source.type}" />`);
  });

  // iOS8-9 inline video (muted only)
  if (scrollplayPct || isAutoplay) {
    nextFrame(() => {
      playInline(videoEl, !isMuted);
    });
  }

  const timeRemainingEl = html`<time class="VideoPlayer-timeRemaining"></time>`;
  const progressBarEl = html`<progress class="VideoPlayer-progressBar" value="0"></progress>`;

  const player = {
    isAutoplay,
    scrollplayPct,
    getRect: () => {
      return videoEl.getBoundingClientRect();
    },
    toggleMute: event => {
      event.stopPropagation();
      player.isUserInControl = true;
      videoEl.muted = !videoEl.muted;
      toggleAttribute(videoEl, 'muted', videoEl.muted);
    },
    togglePlay: (event, wasScrollBased) => {
      const wasPaused = videoEl.paused;
      
      if (!wasScrollBased) {
        player.isUserInControl = true;
      }

      if (wasPaused) {
        selectAll('video').forEach(otherVideoEl => {
          if (otherVideoEl !== videoEl && !otherVideoEl.paused && !otherVideoEl.hasAttribute('autoplay')) {
            otherVideoEl.pause();
            otherVideoEl.removeAttribute('playing');
          }
        });
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

      timeRemainingEl.textContent = `${
        secondsRemaining > 0 ? '-' : ''
      }${
        Math.floor(secondsRemaining / 60)
      }:${
        twoDigits(Math.round(secondsRemaining % 60))
      }`;

      progressBarEl.setAttribute('value', progress);

      player.previousTime = Math.floor(videoEl.currentTime);
    }
  };

  players.push(player);

  const playbackUpdateInterval = setInterval(() => {
	  if (videoEl.readyState > 0 && Math.floor(videoEl.currentTime) !== player.previousTime) {
      player.updatePlaybackPosition();
    }
  }, 1000);

  videoEl.addEventListener('ended', () => {
    player.isUserInControl = true;
    videoEl.currentTime = 0;
    videoEl.removeAttribute('playing', '');
    videoEl.setAttribute('ended', '');
  });

  return html`
    <div class="VideoPlayer">
      <div class="u-sizer-sm-16x9 u-sizer-md-16x9 u-sizer-lg-16x9"></div>
      ${videoEl}
      ${isAmbient ? null : html`
        <button class="VideoPlayer-interface" onclick=${player.togglePlay}>
          <button class="VideoPlayer-mute" title="Mute control" onclick=${player.toggleMute}></button>
          ${timeRemainingEl}
          ${progressBarEl}
        </button>
      `}
    </div>
  `;
};

function getMetadata(videoId, callback) {
  function done(err, metadata) {
    nextFrame(() => {
      callback(err, metadata);
    });
  }

  if ('WCMS' in window) {
    // Phase 2
    // * Sources & poster are nested inside global `WCMS` object

    let wasConfigFound;

    Object.keys(WCMS.pluginCache.plugins.videoplayer).forEach(key => {
      if (wasConfigFound) {
        return;
      }

      const config = WCMS.pluginCache.plugins.videoplayer[key][0].videos[0];

      if (config.url.indexOf(videoId) > -1) {
        wasConfigFound = true;

        const posterURL = config.thumbnail.replace('-thumbnail', '-large');
        const sources = config.sources.map(source => ({src: source.url, type: source.contentType}));

        done(null, {posterURL, sources});
      }
    });
  } else {
    // Phase 1
    // * Video must be published because...
    // * Sources and poster must be fetched from live Content API

    xhr({
      json: true,
      url: `${API_URL_ROOT}${videoId}`
    }, (err, response, body) => {
      if (err || response.statusCode !== 200) {
        return done(new Error('This video is unpublished and cannot be previewed on the Phase 1 (Mobile) site)'));
      }

      const posterId = body.relatedItems.length > 0 ? body.relatedItems[0].id : null;
      const posterURL = posterId ? `/news/rimage/${posterId}-16x9-large.jpg` : null; // TODO: Can we always depend on Phase 2 image?
      const sources = body.renditions.map(rendition => ({src: rendition.url, type: rendition.contentType}));

      done(null, {posterURL, sources});
    });
  }
}

function measure(viewport) {
  players.forEach(player => {
    const rect = player.getRect();
    const scrollplayExtent = (viewport.height / 100 * (player.scrollplayPct || 0));

    player.isVisible = (
      // Fully inside viewport
      (rect.top >= 0 && rect.bottom <= viewport.height) ||
      // Fully covering viewport
      (rect.top <= 0 && rect.bottom >= viewport.height) ||
      // Top within scrollplay range
      (rect.top >= 0 && rect.top <= (viewport.height - scrollplayExtent)) ||
      // Bottom within scrollplay range
      (rect.bottom >= scrollplayExtent && (rect.bottom <= viewport.height))
    );
  });
}

function mutate() {
  players.forEach(player => {
    if (player.isUserInControl || player.isAutoplay || !player.scrollplayPct) {
      return;
    }

    if (
      (typeof player.wasVisible === 'undefined' && player.isVisible) ||
      (typeof player.wasVisible !== 'undefined' && player.isVisible !== player.wasVisible)
    ) {
      player.togglePlay(null, true);
    }

    player.wasVisible = player.isVisible;
  });
}

subscribe({
  measure,
  mutate
});

module.exports = VideoPlayer;
module.exports.getMetadata = getMetadata;
