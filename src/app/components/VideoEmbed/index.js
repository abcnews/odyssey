// External
const cn = require('classnames');
const html = require('bel');
const playInline = require('iphone-inline-video');
const url2cmid = require('util-url2cmid');
const xhr = require('xhr');

// Ours
const {append, before, detach, prepend, select} = require('../../../utils');
const {subscribe} = require('../../loop');
const Caption = require('../Caption');
// const {SIZES} = require('../Picture');

const API_URL_ROOT = 'https://content-gateway.abc-prod.net.au/api/v1/content/id/';
const SCROLLPLAY_PCT_PATTERN = /scrollplay(\d+)/;
// const IS_PHASE_2 = document.querySelectorAll('img[src*="thumbnail"]').length > 0;

const instances = [];

function VideoEmbed({
  videoId,
  captionEl,
  isAutoplay,
  isFullscreen,
  isLoop,
  isMuted,
  scrollplayPct
}) {
  const className = cn('VideoEmbed', {
    'u-pull': !isFullscreen,
    'u-full': isFullscreen
  });

  const videoEmbedEl = html`
    <div class="${className}">
      ${captionEl}
    </div>
  `;

  const videoElBoolAttrs = {
    controls: true, // TODO: Remove this when custom controls exist
    autoplay: isAutoplay,
    loop: isLoop,
    muted: isAutoplay || isMuted,
    playsinline: true,
    scrollplay: !!scrollplayPct,
    'webkit-playsinline': true
  };

  xhr({
    json: true,
    url: `${API_URL_ROOT}${videoId}`
  }, (err, response, body) => {
    if (err) {
      return;
    }

    const posterId = body.relatedItems.length > 0 ? body.relatedItems[0].id : null;
    // const posterURL = posterId ? `/news/${IS_PHASE_2 ? 'r' : ''}image/${posterId}-16x9-${IS_PHASE_2 ? 'large' : SIZES['16x9'].md}.jpg` : null;
    const posterURL = posterId ? `/news/rimage/${posterId}-16x9-large.jpg` : null;

    const videoEl = html`<video poster="${posterURL ? posterURL : ''}"></video>`;

    Object.keys(videoElBoolAttrs).forEach(attrName => {
      if (videoElBoolAttrs[attrName]) {
        videoEl.setAttribute(attrName, '');
      }
    });

    body.renditions.forEach(rendition => {
      append(videoEl, html`<source src="${rendition.url}" type="${rendition.contentType}" />`);
    });

    prepend(videoEmbedEl, videoEl);

    // iOS8-9 inline video (muted only)
    if (isAutoplay || isMuted) {
			playInline(videoEl, false);
    }

    instances.push({
      videoEl,
      scrollplayPct: !!scrollplayPct ? scrollplayPct : null,
      pause: () => {
        // TODO: Update controls UI
        videoEl.pause();
      },
      play: () => {
        // TODO: Update controls UI
        videoEl.play();
      },
    });
  });

  return videoEmbedEl;
};

function transformEl(el) {
  const videoId = url2cmid(select('a', el).getAttribute('href'));
  const prevElName = (el.previousElementSibling && el.previousElementSibling.getAttribute('name')) || '';
  const suffix = (prevElName.indexOf('video') === 0 && prevElName.slice(5)) || '';
  const [, scrollplayPctString] = suffix.match(SCROLLPLAY_PCT_PATTERN) || [, ''];

  if (videoId) {
    const videoEmbedEl = VideoEmbed({
      videoId,
      captionEl: Caption.createFromEl(el),
      isAutoplay: suffix.indexOf('autoplay') > -1,
      isFullscreen: suffix.indexOf('fullscreen') > -1,
      isLoop: suffix.indexOf('loop') > -1,
      isMuted: suffix.indexOf('muted') > -1,
      scrollplayPct: scrollplayPctString.length > 0 &&
        Math.max(0, Math.min(100, +scrollplayPctString))
    });

    before(el, videoEmbedEl);
    detach(el);
  }
}

function measure(viewport) {
  instances.forEach((instance, index) => {
    const rect = instance.videoEl.getBoundingClientRect();
    const scrollplayRatio = (instance.scrollplayPct || 100) / 100;

    instance.isVisible = (rect.top - viewport.height * scrollplayRatio < viewport.height) &&
      (rect.bottom + viewport.height * scrollplayRatio > 0);
  });
}

function mutate() {
  instances.forEach(instance => {
    if (!instance.isAutoplay && !instance.scrollplayPct) {
      return;
    }

    if (instance.isVisible !== instance.wasVisible) {
      instance[instance.isVisible ? 'play' : 'pause']();
      instance.videoEl.classList[instance.isVisible ? 'add' : 'remove']('is-visible');
    }

    instance.isVisible = instance.wasVisible;
  });
}

subscribe({
  measure,
  mutate
});

module.exports = VideoEmbed;
module.exports.transformEl = transformEl;
