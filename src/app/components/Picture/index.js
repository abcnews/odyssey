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
 * @param {Record<string, string | undefined>} [obj.ratios]
 * @param {string} [obj.linkUrl]
 * @param {boolean} [obj.isContained]
 * @param {boolean} [obj.shouldLazyLoad]
 * @returns {HTMLElement}
 */
const Picture = ({
  src = SMALLEST_IMAGE,
  alt = '',
  ratios: requestedRatios = {},
  linkUrl = '',
  isContained = false,
  shouldLazyLoad = true
}) => {
  /** @type {Record<string, string>} */
  const ratios = {
    sm: requestedRatios.sm || DEFAULT_RATIOS.sm,
    md: requestedRatios.md || DEFAULT_RATIOS.md,
    lg: requestedRatios.lg || DEFAULT_RATIOS.lg,
    xl: requestedRatios.xl || DEFAULT_RATIOS.xl
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

  // When 'use original image' is checked in CM the imageDoc will only contain a single entry in the 'ratios' object.
  // That means when we generate renditions for the image from our desired WIDTHS only renditions for the ratio of the
  // original image will be generated.
  const imageDoc = lookupImageByAssetURL(src); // Will only work if image's document was catalogued during initMeta

  // Therefore we assume if there's only a single entry, this is a 'use original image' image.
  const isOriginal = Object.keys(imageDoc?.media?.image.primary.ratios || {}).length === 1;

  if (imageDoc) {
    const { renditions } = getImages(imageDoc, WIDTHS);
    if (renditions && renditions.length) {
      sources[MQ.SM] = srcsetFromRenditions(renditions, ratios.sm);
      sources[MQ.MD] = srcsetFromRenditions(renditions, ratios.md);
      sources[MQ.LANDSCAPE_LT_LG] = srcsetFromRenditions(renditions, ratios.lg);
      sources[MQ.LG] = srcsetFromRenditions(renditions, ratios.lg);
      sources[MQ.XL] = srcsetFromRenditions(renditions, ratios.xl);
      // This 'all' media query/srcset combo is used when an image has 'use original image' checked in CM. This works
      // because the only renditions will be ones with a ratio that matches the original image. Therefore (unless the
      // 'original' image happens to be the same as one of the standard ratios) this 'all' key in the sources object
      // will be the only one populated with a srcset. All the others will be null.
      sources['all'] = srcsetFromRenditions(renditions);
    }

    alt = imageDoc.alt || '';
  }

  const sizerEl = Sizer(ratios);

  const srcsets = Object.entries(sources).filter(([, srcset]) => !!srcset);
  const pictureEl = html`<picture
    >${srcsets.map(
      // TODO: Ideally this would have a more nuanced sizes attribute right now it is assumed that images display at
      // full viewport width, but that is not always the case.
      ([media, srcset]) => html`<source media=${media} srcset=${srcset} sizes="100vw"></source>`
    )}</picture
  >`;

  /**
   * @type {HTMLElement & {api?: import('./lazy').LazyLoadAPI}}
   */
  const rootEl = html`<a class=${cn('Picture', { 'is-contained': isContained, 'is-original': isOriginal })}
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
