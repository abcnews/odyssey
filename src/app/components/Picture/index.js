// @ts-check
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

/**
 *
 * @param {object} obj
 * @param {string} [obj.src]
 * @param {string|null} [obj.alt]
 * @param {Record<string, string>} [obj.ratios]
 * @param {string} [obj.linkUrl]
 * @param {boolean} [obj.isContained]
 * @param {boolean} [obj.shouldLazyLoad]
 * @returns {HTMLElement}
 */
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

  /**
   * @type {Record<string, string|null>}
   */
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
      sources[MQ.SM] = srcsetFromRenditions(renditions, ratios.sm);
      sources[MQ.MD] = srcsetFromRenditions(renditions, ratios.md);
      sources[MQ.LANDSCAPE_LT_LG] = srcsetFromRenditions(renditions, ratios.lg);
      sources[MQ.LG] = srcsetFromRenditions(renditions, ratios.lg);
      sources[MQ.XL] = srcsetFromRenditions(renditions, ratios.xl);
      sources['all'] = srcsetFromRenditions(renditions);
    }

    alt = imageDoc.alt || '';
  }

  const sizerEl = Sizer(ratios);

  const srcsets = Object.entries(sources).filter(([, srcset]) => !!srcset);
  const pictureEl = html`<picture
    >${srcsets.map(
      // TODO: Ideally this would have a more nuanced sizes attribute
      ([media, srcset]) => html`<source media=${media} srcset=${srcset} sizes="100vw"></source>`
    )}</picture
  >`;

  /**
   * @type {HTMLElement & {api?: import('./lazy').LazyLoadAPI}}
   */
  const rootEl = html`<a class=${cn('Picture', { 'is-contained': isContained, 'is-original': srcsets.length === 1 })}
    >${sizerEl}${pictureEl}</a
  >`;

  if (linkUrl) {
    rootEl.setAttribute('href', linkUrl);
  }

  if (shouldLazyLoad) {
    addLazyLoadableAPI({ rootEl, placeholderEl: sizerEl, pictureEl, blurSrc: src, alt });
  } else {
    const imgEl = document.createElement('img');

    alt && imgEl.setAttribute('alt', alt);
    imgEl.addEventListener('load', () => rootEl.api?.loadedHook && rootEl.api.loadedHook(imgEl));
    append(pictureEl, imgEl);

    delete rootEl.api;
    rootEl.setAttribute('loaded', '');
  }

  styles.use();

  return rootEl;
};

export default Picture;

/**
 *
 * @param {{width: number;height: number;ratio: string;url: string;isUndersizedBinary: boolean;}[]} renditions
 * @param {string} [preferredRatio]
 * @returns
 */
function srcsetFromRenditions(renditions, preferredRatio) {
  if (!renditions) {
    return null;
  }

  // Filter renditions for preferredRatio
  const preferredRatioRenditions = renditions.filter(r => preferredRatio === undefined || r.ratio === preferredRatio);
  if (preferredRatioRenditions.length === 0) {
    return null;
  }

  return preferredRatioRenditions.map(r => `${r.url} ${r.width}w`).join(', ');
}
