// External
import html from 'bel';
import cn from 'classnames';
import url2cmid from 'util-url2cmid';

// Ours
import { IS_PREVIEW, ALIGNMENT_PATTERN, VIDEO_MARKER_PATTERN, SCROLLPLAY_PCT_PATTERN } from '../../../constants';
import { invalidateClient } from '../../scheduler';
import { grabConfigSC } from '../../utils/anchors';
import { $, $$, substitute } from '../../utils/dom';
import { getRatios } from '../../utils/misc';
import { createFromEl as createCaptionFromEl } from '../Caption';
import VideoPlayer from '../VideoPlayer';
import YouTubePlayer from '../YouTubePlayer';
import './index.scss';

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

export function transformEl(el) {
  const isMarker = el.name && !!el.name.match(VIDEO_MARKER_PATTERN);
  const videoId = isMarker ? el.name.match(VIDEO_MARKER_PATTERN)[1] : url2cmid($('a', el).getAttribute('href'));

  if (!videoId) {
    return;
  }

  const configSC = grabConfigSC(el);
  const [, alignment] = configSC.match(ALIGNMENT_PATTERN) || [];
  const unlink = configSC.includes('unlink');

  const isYouTube = isMarker && el.name.indexOf('youtube') === 0;
  const captionEl = !isMarker ? createCaptionFromEl(el, unlink) : null;
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
    isAmbient: configSC.indexOf('ambient') > -1,
    isLoop: configSC.indexOf('loop') > -1,
    isMuted: configSC.indexOf('muted') > -1,
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

export function transformMarker(marker) {
  return transformEl(marker.node);
}

export default VideoEmbed;
