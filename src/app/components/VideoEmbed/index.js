// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const {IS_PREVIEW, ALIGNMENT_PATTERN} = require('../../../constants');
const {getRatios, grabConfigSC, $, $$, substitute} = require('../../../utils');
const {invalidateClient} = require('../../scheduler');
const Caption = require('../Caption');
const VideoPlayer = require('../VideoPlayer');

const SCROLLPLAY_PCT_PATTERN = /scrollplay(\d+)/;

function VideoEmbed({
  videoPlayerEl,
  captionEl,
  alignment,
  isFull,
  isCover,
  isAnon
}) {
  if (isCover) {
    isFull = true;
    isAnon = true;
  }

  const className = cn('VideoEmbed', {
    [`u-pull-${alignment}`]: !isFull && alignment,
    'u-pull': !isFull && !alignment,
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

  const configSC = grabConfigSC(el);
  const [, alignment] = configSC.match(ALIGNMENT_PATTERN) || [];

  const options = {
    alignment,
    isFull: configSC.indexOf('full') > -1,
    isCover: configSC.indexOf('cover') > -1,
    isAnon: configSC.indexOf('anon') > -1
  };

  const [, scrollplayPctString] = configSC.match(SCROLLPLAY_PCT_PATTERN) ||
    [, configSC.indexOf('autoplay') > -1 ? '0' : ''];
  const scrollplayPct = scrollplayPctString.length > 0 &&
      Math.max(0, Math.min(100, +scrollplayPctString));

  const videoPlayerOptions = {
    ratios: getRatios(configSC),
    isAlwaysHQ: options.isCover || options.isFull,
    isAmbient: configSC.indexOf('ambient') > -1,
    isLoop: configSC.indexOf('loop') > -1,
    isMuted: configSC.indexOf('muted') > -1,
    scrollplayPct
  };

  const videoPlayerPlaceholderEl = html`<div></div>`;

  VideoPlayer.getMetadata(videoId, (err, metadata) => {
    if (err) {
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
