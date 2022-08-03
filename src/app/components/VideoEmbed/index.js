import { getMountValue, isMount } from '@abcnews/mount-utils';
import cn from 'classnames';
import html from 'bel';
import { url2cmid } from '@abcnews/url2cmid';
import { ALIGNMENT_PATTERN, VIDEO_MARKER_PATTERN, SCROLLPLAY_PCT_PATTERN } from '../../../constants';
import { $, substitute } from '../../utils/dom';
import { getRatios } from '../../utils/misc';
import { grabPrecedingConfigString } from '../../utils/mounts';
import { createFromElement as createCaptionFromElement } from '../Caption';
import VideoPlayer from '../VideoPlayer';
import YouTubePlayer from '../YouTubePlayer';
import './index.scss';

const VideoEmbed = ({ playerEl, captionEl, alignment, isFull, isCover, isAnon }) => {
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

  return html`<div class="${className}">${playerEl} ${isAnon ? null : captionEl}</div>`;
};

export default VideoEmbed;

export const transformElement = el => {
  const mountValue = isMount(el) ? getMountValue(el) : '';
  const isVideoMarker = !!mountValue.match(VIDEO_MARKER_PATTERN);
  const linkEl = $('a[href]', el);
  const playerIdEl = $('[data-component="Player"] div[id]', el);
  const expiredMediaWarningEl = $('[data-component="ExpiredMediaWarning"]', el);
  const videoId = isVideoMarker
    ? mountValue.match(VIDEO_MARKER_PATTERN)[1]
    : playerIdEl && playerIdEl.id
    ? playerIdEl.id
    : expiredMediaWarningEl
    ? el.getAttribute('data-uri').match(/\d+/)
    : linkEl
    ? url2cmid(linkEl.getAttribute('href'))
    : false;

  if (!videoId) {
    return;
  }

  const configString = grabPrecedingConfigString(el);
  const [, alignment] = configString.match(ALIGNMENT_PATTERN) || [];
  const unlink = configString.indexOf('unlink') > -1;

  const isYouTube = isVideoMarker && mountValue.indexOf('youtube') === 0;
  const captionEl = !isVideoMarker ? createCaptionFromElement(el, unlink) : null;
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
};

export const transformMarker = marker => {
  return transformElement(marker.node);
};
