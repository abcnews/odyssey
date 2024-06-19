import { getMountValue, isMount } from '@abcnews/mount-utils';
import { url2cmid } from '@abcnews/url2cmid';
import cn from 'classnames';
import html from 'nanohtml';
import { ALIGNMENT_PATTERN, EMBED_ALIGNMENT_MAP, VIDEO_MARKER_PATTERN, SCROLLPLAY_PCT_PATTERN } from '../../constants';
import { $, detectVideoId, substitute } from '../../utils/dom';
import { getRatios } from '../../utils/misc';
import { grabPrecedingConfigString } from '../../utils/mounts';
import { createFromElement as createCaptionFromElement } from '../Caption';
import VideoPlayer from '../VideoPlayer';
import YouTubePlayer from '../YouTubePlayer';
import styles from './index.lazy.scss';

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

  styles.use();

  return html`<div class="${className}">${playerEl} ${isAnon ? null : captionEl}</div>`;
};

export default VideoEmbed;

export const transformElement = el => {
  const mountValue = isMount(el) ? getMountValue(el) : '';
  const isVideoMarker = !!mountValue.match(VIDEO_MARKER_PATTERN);
  const linkEl = $('a[href]', el);
  const playerIdEl = $('[data-component="VideoPlayer"]', el);
  const expiredMediaWarningEl = $('[data-component="ExpiredMediaWarning"]', el);
  const videoId = isVideoMarker
    ? mountValue.match(VIDEO_MARKER_PATTERN)[1]
    : playerIdEl
    ? detectVideoId(el)
    : expiredMediaWarningEl
    ? el.getAttribute('data-uri').match(/\d+/)
    : linkEl
    ? url2cmid(linkEl.getAttribute('href'))
    : false;

  if (!videoId) {
    return;
  }

  const configString = grabPrecedingConfigString(el);
  const descriptorAlignment = el._descriptor ? EMBED_ALIGNMENT_MAP[el._descriptor.props.align] : undefined;
  const [, alignment] = configString.match(ALIGNMENT_PATTERN) || [, descriptorAlignment];
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
    scrollplayPct,
    videoDuration: $('time', el),
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
