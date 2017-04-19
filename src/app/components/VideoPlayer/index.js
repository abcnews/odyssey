// External
const html = require('bel');
const playInline = require('iphone-inline-video');

// Ours
const {append, selectAll, toggleAttribute} = require('../../../utils');
const {nextFrame, subscribe} = require('../../loop');

const players = [];

function VideoPlayer({
  posterURL,
  sources = [],
  isAutoplay,
  isFullscreen,
  isLoop,
  isMuted,
  scrollplayPct
}) {
  const videoEl = html`<video poster="${posterURL ? posterURL : ''}" preload="${scrollplayPct ? 'auto' : 'none'}"></video>`;

  const booleanAttributes = {
    autoplay: isAutoplay,
    loop: isLoop,
    muted: isAutoplay || isMuted,
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
  if (isAutoplay || isMuted) {
    nextFrame(() => {
      playInline(videoEl, false);
    });
  }

  const player = {
    isAutoplay,
    scrollplayPct,
    getRect: () => {
      return videoEl.getBoundingClientRect();
    },
    toggleMute: event => {
      event.stopPropagation();

      player.hasUserInteracted = true;

      videoEl.muted = !videoEl.muted;
      toggleAttribute(videoEl, 'muted', videoEl.muted);
    },
    togglePlay: (event, wasScrollBased) => {
      const wasPaused = videoEl.paused;
      
      if (!wasScrollBased) {
        player.hasUserInteracted = true;
      }

      if (wasPaused) {
        selectAll('video').forEach((otherVideoEl) => {
          if (otherVideoEl !== videoEl && !otherVideoEl.paused) {
            otherVideoEl.pause();
            otherVideoEl.removeAttribute('playing');
          }
        });
      }

      videoEl[wasPaused ? 'play' : 'pause']();
      toggleAttribute(videoEl, 'playing', wasPaused);
      setTimeout(() => {
        videoEl.removeAttribute('ended');
      }, 300);
    }
  };

  players.push(player);

  videoEl.addEventListener('ended', () => {
    videoEl.removeAttribute('playing', '');
    videoEl.setAttribute('ended', '');
  });

  return html`
    <div class="VideoPlayer">
      <div class="u-sizer-sm-16x9 u-sizer-md-16x9 u-sizer-lg-16x9"></div>
      ${videoEl}
      <div class="VideoPlayer-controls" onclick=${player.togglePlay}>
        <button class="VideoPlayer-mute" title="Mute control" onclick=${player.toggleMute}></button>
      </div>
    </div>
  `;
};

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
      // // Top within scrollplay range
      // ((rect.top >= (viewport.height - scrollplayExtent)) && (rect.top <= viewport.height)) ||
      // // Bottom within scrollplay range
      // ((rect.bottom >= 0) && (rect.bottom <= scrollplayExtent))
    );
  });
}

function mutate() {
  players.forEach(player => {
    if (player.hasUserInteracted || !player.isAutoplay && !player.scrollplayPct) {
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
