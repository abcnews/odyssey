// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const {IS_PREVIEW} = require('../../../constants');
const {before, detachAll, prepend, select, selectAll} = require('../../../utils');
const Caption = require('../Caption');
const VideoPlayer = require('../VideoPlayer');

const SCROLLPLAY_PCT_PATTERN = /scrollplay(\d+)/;

function VideoEmbed({
  videoId,
  captionEl,
  isAmbient,
  isAutoplay,
  isFullscreen,
  isLoop,
  isMuted,
  scrollplayPct
}) {
  if (isAmbient) {
    isFullscreen = true;
  }

  const className = cn('VideoEmbed', {
    'u-pull': !isFullscreen,
    'u-full': isFullscreen
  });

  const videoEmbedEl = html`
    <div class="${className}">
      ${captionEl}
    </div>
  `;

  VideoPlayer.getMetadata(videoId, (err, metadata) => {
    if (err) {
      if (IS_PREVIEW) {
        prepend(videoEmbedEl, html`
          <div class="VideoEmbed-unpublished">
            <div class="u-sizer-sm-16x9 u-sizer-md-16x9 u-sizer-lg-16x9"></div>
            <p>
              This video is unpublished and cannot be previewed in Phase 1. Have a look in
              <a target="_blank" href="${
                window.location.href.replace('nucwed', 'beta-nucwed')
              }">Phase 2</a>.
            </p>
          </div>
        `);
      }
    
      return;
    }

    prepend(videoEmbedEl, VideoPlayer(Object.assign(metadata, {
      isAmbient,
      isAutoplay,
      isFullscreen,
      isLoop,
      isMuted,
      scrollplayPct,
    })));
  });

  return videoEmbedEl;
};

function transformEl(el) {
  const videoId = url2cmid(select('a', el).getAttribute('href'));
  const prevEl = el.previousElementSibling;
  const prevElName = (prevEl && el.previousElementSibling.getAttribute('name')) || '';
  const suffix = (prevElName.indexOf('video') === 0 && prevElName.slice(5)) || '';
  const [, scrollplayPctString] = suffix.match(SCROLLPLAY_PCT_PATTERN) || [, ''];

  if (videoId) {
    const videoEmbedEl = VideoEmbed({
      videoId,
      captionEl: Caption.createFromEl(el),
      isAmbient: suffix.indexOf('ambient') > -1,
      isAutoplay: suffix.indexOf('autoplay') > -1,
      isFullscreen: suffix.indexOf('fullscreen') > -1,
      isLoop: suffix.indexOf('loop') > -1,
      isMuted: suffix.indexOf('muted') > -1,
      scrollplayPct: scrollplayPctString.length > 0 &&
        Math.max(0, Math.min(100, +scrollplayPctString))
    });

    before(el, videoEmbedEl);
    detachAll([prevEl, el]);
  }
}

module.exports = VideoEmbed;
module.exports.transformEl = transformEl;
