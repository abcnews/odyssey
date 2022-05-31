// External
const { getMountValue, isMount } = require('@abcnews/mount-utils');
const cn = require('classnames');
const html = require('bel');
const { url2cmid } = require('@abcnews/url2cmid');

// Ours
const { ALIGNMENT_PATTERN, VIDEO_MARKER_PATTERN, SCROLLPLAY_PCT_PATTERN } = require('../../../constants');
const { invalidateClient } = require('../../scheduler');
const { $, $$, substitute } = require('../../utils/dom');
const { getRatios } = require('../../utils/misc');
const { grabPrecedingConfigString } = require('../../utils/mounts');
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

  return html` <div class="${className}">${playerEl} ${isAnon ? null : captionEl}</div> `;
}

function transformEl(el) {
  const mountSC = isMount(el) ? getMountValue(el) : '';
  const isMarker = !!mountSC.match(VIDEO_MARKER_PATTERN);
  const linkEl = $('a[href]', el);
  const plPlayerIdEl = $('[data-component="Player"] div[id]', el);
  const videoId = isMarker
    ? mountSC.match(VIDEO_MARKER_PATTERN)[1]
    : plPlayerIdEl && plPlayerIdEl.id
    ? plPlayerIdEl.id
    : linkEl
    ? url2cmid(linkEl.getAttribute('href'))
    : false;

  if (!videoId) {
    return;
  }

  const configString = grabPrecedingConfigString(el);
  const [, alignment] = configString.match(ALIGNMENT_PATTERN) || [];
  const unlink = configString.includes('unlink');

  const isYouTube = isMarker && mountSC.indexOf('youtube') === 0;
  const captionEl = !isMarker ? Caption.createFromEl(el, unlink) : null;
  const title = captionEl ? captionEl.children[0].textContent : null;

  const options = {
    alignment,
    isFull: configString.indexOf('full') > -1,
    isCover: configString.indexOf('cover') > -1,
    isAnon: configString.indexOf('anon') > -1
  };

  const [, scrollplayPctString] = configString.match(SCROLLPLAY_PCT_PATTERN) || [
    ,
    configString.indexOf('autoplay') > -1 ? '0' : ''
  ];
  const scrollplayPct = scrollplayPctString.length > 0 && Math.max(0, Math.min(100, +scrollplayPctString));

  const playerOptions = {
    videoId,
    ratios: getRatios(configString),
    title,
    isAmbient: configString.indexOf('ambient') > -1 ? true : undefined,
    isLoop: configString.indexOf('loop') > -1 ? true : configString.indexOf('once') > -1 ? false : undefined,
    isMuted: configString.indexOf('muted') > -1 ? true : undefined,
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
