import { getImages } from '@abcnews/terminus-fetch';
import cn from 'classnames';
import html from 'nanohtml';
import { MQ, SMALLEST_IMAGE } from '../../constants';
import { lookupImageByAssetURL } from '../../meta';
import { append } from '../../utils/dom';
import Sizer from '../Sizer';
import styles from './index.lazy.scss';
import { addLazyLoadableAPI } from './lazy';

const DEFAULT_RATIOS = {
  sm: '1x1',
  md: '3x2',
  lg: '16x9',
  xl: '16x9'
};
const WIDTHS = [700, 940, 1400, 2150];
const RATIO_SIZE_WIDTH_INDICES = {
  '16x9': { sm: 0, md: 1, lg: 3, xl: 3 },
  '3x2': { sm: 0, md: 1, lg: 1, xl: 1 },
  '4x3': { sm: 0, md: 1, lg: 1, xl: 1 },
  '1x1': { sm: 0, md: 1, lg: 2, xl: 2 },
  '3x4': { sm: 0, md: 1, lg: 1, xl: 1 }
};

const Picture = ({
  src = SMALLEST_IMAGE,
  alt = '',
  ratios = {},
  linkUrl = '',
  isContained = false,
  shouldLazyLoad = true
}) => {
  ratios = {
    sm: ratios.sm || DEFAULT_RATIOS.sm,
    md: ratios.md || DEFAULT_RATIOS.md,
    lg: ratios.lg || DEFAULT_RATIOS.lg,
    xl: ratios.xl || DEFAULT_RATIOS.xl
  };

  const sources = {
    [MQ.SM]: src,
    [MQ.MD]: src,
    [MQ.LANDSCAPE_LT_LG]: src,
    [MQ.LG]: src,
    [MQ.XL]: src
  };

  const imageDoc = lookupImageByAssetURL(src); // Will only work if image's document was catalogued during initMeta

  if (imageDoc) {
    const { renditions } = getImages(imageDoc, WIDTHS);
    if (renditions && renditions.length) {
      sources[MQ.SM] = srcsetFromRenditions(renditions, ratios.sm, 'sm');
      sources[MQ.MD] = srcsetFromRenditions(renditions, ratios.md, 'md');
      sources[MQ.LANDSCAPE_LT_LG] = srcsetFromRenditions(renditions, ratios.lg, 'md');
      sources[MQ.LG] = srcsetFromRenditions(renditions, ratios.lg, 'lg');
      sources[MQ.XL] = srcsetFromRenditions(renditions, ratios.xl, 'xl');
    }

    alt = imageDoc.alt;
  }

  const sizerEl = Sizer(ratios);

  const srcsets = Object.entries(sources).filter(([, srcset]) => !!srcset);
  const pictureEl = html`<picture
    >${srcsets.map(
      // TODO: Ideally this would have a more nuanced sizes attribute
      ([media, srcset]) => html`<source media=${media} srcset=${srcset} sizes="100vw"></source>`
    )}</picture
  >`;

  const rootEl = html`<a class=${cn('Picture', { 'is-contained': isContained })}>${sizerEl}${pictureEl}</a>`;

  if (linkUrl) {
    rootEl.setAttribute('href', linkUrl);
  }

  if (shouldLazyLoad) {
    addLazyLoadableAPI({ rootEl, placeholderEl: sizerEl, pictureEl, blurSrc: src, alt });
  } else {
    const imgEl = document.createElement('img');

    imgEl.setAttribute('alt', alt);
    imgEl.addEventListener('load', () => rootEl.api.loadedHook && rootEl.api.loadedHook(imgEl));
    append(pictureEl, imgEl);

    rootEl.api = {};
    rootEl.setAttribute('loaded', '');
  }

  styles.use();

  return rootEl;
};

export default Picture;

function srcsetFromRenditions(renditions, preferredRatio) {
  if (!renditions) {
    return null;
  }

  // Filter renditions for preferredRatio
  const preferredRatioRenditions = renditions.filter(r => r.ratio === preferredRatio);
  if (preferredRatioRenditions.length === 0) {
    return null;
  }

  return preferredRatioRenditions.map(r => `${r.url} ${r.width}w`).join(', ');
}
