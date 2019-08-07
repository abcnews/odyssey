// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const { IS_PREVIEW, ALIGNMENT_PATTERN, VIDEO_MARKER_PATTERN, SCROLLPLAY_PCT_PATTERN } = require('../../../constants');
const { invalidateClient } = require('../../scheduler');
const { grabConfigSC } = require('../../utils/anchors');
const { $, $$, substitute } = require('../../utils/dom');
const { getRatios } = require('../../utils/misc');
const Caption = require('../Caption');
const VideoPlayer = require('../VideoPlayer');
const YouTubePlayer = require('../YouTubePlayer');
require('./index.scss');

function VideoEmbed({ playerEl, captionEl, alignment, isFull, isCover, isAnon }) {
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
    <div class="${className}">${playerEl} ${isAnon ? null : captionEl}</div>
  `;
}

function transformEl(el) {
  const linkEl = $('a[href]', el);
  const isMarker = el.name && !!el.name.match(VIDEO_MARKER_PATTERN);
  const videoId = isMarker ? el.name.match(VIDEO_MARKER_PATTERN)[1] : linkEl && url2cmid(linkEl.getAttribute('href'));

  if (!videoId) {
    return;
  }

  const configSC = grabConfigSC(el);
  const [, alignment] = configSC.match(ALIGNMENT_PATTERN) || [];
  const unlink = configSC.includes('unlink');

  const isYouTube = isMarker && el.name.indexOf('youtube') === 0;
  const captionEl = !isMarker ? Caption.createFromEl(el, unlink) : null;
  const title = captionEl ? captionEl.children[0].textContent : null;

  const options = {
    alignment,
    isFull: configSC.indexOf('full') > -1,
    isCover: configSC.indexOf('cover') > -1,
    isAnon: configSC.indexOf('anon') > -1
  };

  const [, scrollplayPctString] = configSC.match(SCROLLPLAY_PCT_PATTERN) || [
    ,
    configSC.indexOf('autoplay') > -1 ? '0' : ''
  ];
  const scrollplayPct = scrollplayPctString.length > 0 && Math.max(0, Math.min(100, +scrollplayPctString));

  const playerOptions = {
    videoId,
    ratios: getRatios(configSC),
    title,
    isAmbient: configSC.indexOf('ambient') > -1 ? true : undefined,
    isLoop: configSC.indexOf('loop') > -1 ? true : configSC.indexOf('once') > -1 ? false : undefined,
    isMuted: configSC.indexOf('muted') > -1 ? true : undefined,
    scrollplayPct
  };

  substitute(
    el,
    VideoEmbed(
      Object.assign(options, {
        playerEl: (isYouTube ? YouTubePlayer : VideoPlayer)(playerOptions),
        captionEl
      })
    )
  );
}

function transformMarker(marker) {
  return transformEl(marker.node);
}

module.exports = VideoEmbed;
module.exports.transformEl = transformEl;
module.exports.transformMarker = transformMarker;
