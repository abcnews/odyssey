// External
const html = require('bel');
const playInline = require('iphone-inline-video');

// Ours
const {append, selectAll, toggleAttribute, twoDigits} = require('../../../utils');
const {nextFrame, subscribe} = require('../../loop');

const players = [];

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
    isMuted = true;
    isFullscreen = true;
    isLoop = true;
    scrollplayPct = 1;
  }

  if (isAutoplay) {
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
      playInline(videoEl, false);
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
        selectAll('video').forEach((otherVideoEl) => {
          if (otherVideoEl !== videoEl && !otherVideoEl.paused) {
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
    }
  };

  players.push(player);

  const readinessCheckInterval = setInterval(() => {
	  if (videoEl.readyState > 0) {
      player.updatePlaybackPosition();
		  clearInterval(readinessCheckInterval);
    }
  }, 200);

  videoEl.addEventListener('timeupdate', player.updatePlaybackPosition);

  videoEl.addEventListener('ended', () => {
    player.isUserInControl = true;
    videoEl.removeAttribute('playing', '');
    videoEl.setAttribute('ended', '');
  });

  return html`
    <div class="VideoPlayer">
      <div class="u-sizer-sm-16x9 u-sizer-md-16x9 u-sizer-lg-16x9"></div>
      ${videoEl}
      ${isAmbient ? null : html`
        <div class="VideoPlayer-interface" onclick=${player.togglePlay}>
          <button class="VideoPlayer-mute" title="Mute control" onclick=${player.toggleMute}></button>
          ${timeRemainingEl}
          ${progressBarEl}
        </div>
      `}
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
    );
  });
}

function mutate() {
  players.forEach(player => {
    if (player.isUserInControl || !player.isAutoplay && !player.scrollplayPct) {
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
