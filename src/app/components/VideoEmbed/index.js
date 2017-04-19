// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');
const xhr = require('xhr');

// Ours
const {before, detach, prepend, select, selectAll} = require('../../../utils');
const Caption = require('../Caption');
const VideoPlayer = require('../VideoPlayer');

const BACKGROUND_IMAGE_PATTERN = /url\(['"]?(.*\.\w*)['"]?\)/;
const API_URL_ROOT = 'https://content-gateway.abc-prod.net.au/api/v1/content/id/';
const SCROLLPLAY_PCT_PATTERN = /scrollplay(\d+)/;

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

  // Create player from poster & sources, inferred based on site template

  function createAndPrependPlayer(posterURL, sources) {
    prepend(videoEmbedEl, VideoPlayer({
      posterURL,
      sources,
      isAutoplay,
      isFullscreen,
      isLoop,
      isMuted,
      scrollplayPct,
    }));
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

        createAndPrependPlayer(posterURL, sources);
      }
    });
  } else if ('inlineVideoData' in window) {
    // Phase 1 (Standard)
    // * Sources are in global `inlineVideoData` object
    // * Poster can be inferred from DOM (pre- or post- jwplayer transform)

    const inlineVideoEls = selectAll(`.inline-video`);
    const scriptTexts = inlineVideoEls.map(el => el.previousElementSibling.textContent);
    let wasConfigFound;

    inlineVideoData.forEach(config => {
      inlineVideoEls.forEach((inlineVideoEl, inlineVideoIndex) => {
        if (wasConfigFound) {
          return;
        }

        if (scriptTexts[inlineVideoIndex].indexOf(config[0].url) > -1) {
          wasConfigFound = true;

          const posterURL = window.getComputedStyle(inlineVideoEl).backgroundImage.replace(BACKGROUND_IMAGE_PATTERN, '$1') ||
            select('img', inlineVideoEl).getAttribute('href')
          const sources = config.map(source => ({src: source.url, type: source.contentType}));

          createAndPrependPlayer(posterURL, sources);
        }
      });
    });
  } else {
    // Phase 1 (Mobile)
    // * Video must be published because...
    // * Sources and poster must be fetched from live Content API

    xhr({
      json: true,
      url: `${API_URL_ROOT}${videoId}`
    }, (err, response, body) => {
      if (err) {
        if (window.location.hostname.indexOf('nucwed') > -1) {
          prepend(videoEmbedEl, html`
            <div class="VideoEmbed-unpublished">This video is unpublished and cannot be previewed on the Phase 1 (Mobile) site</div>
          `);
        }

        return;
      }

      const posterId = body.relatedItems.length > 0 ? body.relatedItems[0].id : null;
      const posterURL = posterId ? `/news/rimage/${posterId}-16x9-large.jpg` : null; // TODO: Can we always depend on Phase 2 image?
      const sources = body.renditions.map(rendition => ({src: rendition.url, type: rendition.contentType}));

      createAndPrependPlayer(posterURL, sources);
    });
  }

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

module.exports = VideoEmbed;
module.exports.transformEl = transformEl;
