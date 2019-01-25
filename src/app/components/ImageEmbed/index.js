// External
import html from 'bel';
import cn from 'classnames';
import url2cmid from 'util-url2cmid';

// Ours
import { ALIGNMENT_PATTERN } from '../../../constants';
import { grabConfigSC } from '../../utils/anchors';
import { $, substitute } from '../../utils/dom';
import { getRatios } from '../../utils/misc';
import { createFromEl as createCaptionFromEl } from '../Caption';
import Picture from '../Picture';
import './index.scss';

function ImageEmbed({ pictureEl, captionEl, alignment, isFull, isCover, isAnon }) {
  if (isCover) {
    isFull = true;
    isAnon = true;
  }

  const className = cn('ImageEmbed', {
    [`u-pull-${alignment}`]: !isFull && alignment,
    'u-pull': !isFull && !alignment,
    'u-full': isFull,
    'is-cover': isCover
  });

  return html`
    <div class="${className}">${pictureEl} ${isAnon ? null : captionEl}</div>
  `;
}

export function transformEl(el, preserveOriginalRatio) {
  const imgEl = $('img', el);

  if (!imgEl) {
    return;
  }

  const configSC = grabConfigSC(el);
  const [, alignment] = configSC.match(ALIGNMENT_PATTERN) || [];
  const ratios = getRatios(configSC);
  const unlink = configSC.includes('unlink');

  const src = imgEl.src;
  const alt = imgEl.getAttribute('alt');
  const id = url2cmid(src);
  const linkUrl = `/news/${id}`;

  const imageEmbedEl = ImageEmbed({
    pictureEl: Picture({
      src,
      alt,
      ratios: {
        sm: ratios.sm || '3x4',
        md: ratios.md || '4x3',
        lg: ratios.lg
      },
      preserveOriginalRatio,
      linkUrl
    }),
    captionEl: createCaptionFromEl(el, unlink),
    alignment,
    isFull: configSC.indexOf('full') > -1,
    isCover: configSC.indexOf('cover') > -1,
    isAnon: configSC.indexOf('anon') > -1
  });

  substitute(el, imageEmbedEl);
}

export default ImageEmbed;
