// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const {IS_PREVIEW} = require('../../../constants');
const {grabConfig, $, $$, substitute} = require('../../../utils');
const {invalidateClient} = require('../../scheduler');
const Caption = require('../Caption');
const VideoPlayer = require('../VideoPlayer');

const SCROLLPLAY_PCT_PATTERN = /scrollplay(\d+)/;

function VideoEmbed({
  videoPlayerEl,
  captionEl,
  isFull,
  isCover,
  isAnon
}) {
  if (isCover) {
    isFull = true;
    isAnon = true;
  }

  const className = cn('VideoEmbed', {
    'u-pull': !isFull,
    'u-full': isFull,
    'is-cover': isCover
  });

  return html`
    <div class="${className}">
      ${videoPlayerEl}
      ${isAnon ? null : captionEl}
    </div>
  `;
};

function transformEl(el) {
  const videoId = url2cmid($('a', el).getAttribute('href'));

  if (!videoId) {
    return;
  }

  const suffix = grabConfig(el);

  const options = {
    isFull: suffix.indexOf('full') > -1,
    isCover: suffix.indexOf('cover') > -1,
    isAnon: suffix.indexOf('anon') > -1
  };

  const [, scrollplayPctString] = suffix.match(SCROLLPLAY_PCT_PATTERN) ||
    [, suffix.indexOf('autoplay') > -1 ? '0' : ''];
  const scrollplayPct = scrollplayPctString.length > 0 &&
      Math.max(0, Math.min(100, +scrollplayPctString));

  const videoPlayerOptions = {
    isAlwaysHQ: options.isCover || options.isFull,
    isAmbient: suffix.indexOf('ambient') > -1,
    isLoop: suffix.indexOf('loop') > -1,
    isMuted: suffix.indexOf('muted') > -1,
    scrollplayPct
  };

  const videoPlayerPlaceholderEl = html`<div></div>`;

  VideoPlayer.getMetadata(videoId, (err, metadata) => {
    if (err) {
      if (IS_PREVIEW) {
        substitute(videoPlayerPlaceholderEl, VideoPlayer.UnpublishedVideoPlaceholder(videoId));
      }
    
      return;
    }

    substitute(videoPlayerPlaceholderEl, VideoPlayer(Object.assign(videoPlayerOptions, metadata)));
    invalidateClient();
  });

  substitute(el, VideoEmbed(Object.assign(options, {
    videoPlayerEl: videoPlayerPlaceholderEl,
    captionEl: Caption.createFromEl(el)
  })));
}

module.exports = VideoEmbed;
module.exports.transformEl = transformEl;
