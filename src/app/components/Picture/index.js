import { getImages } from '@abcnews/terminus-fetch';
import cn from 'classnames';
import html from 'nanohtml';
import { MQ, SMALLEST_IMAGE } from '../../constants';
import { lookupImageByAssetURL } from '../../meta';
import { enqueue, subscribe } from '../../scheduler';
import { append, detach } from '../../utils/dom';
import { proximityCheck } from '../../utils/misc';
import Sizer from '../Sizer';
import { blurImage } from './blur';
import './index.scss';

const WIDTHS = [700, 940, 1400, 2150];
const SIZES = {
  '16x9': { sm: '700x394', md: '940x529', lg: '2150x1210', xl: '2150x1210' },
  '3x2': { sm: '700x467', md: '940x627', lg: '940x627', xl: '940x627' },
  '4x3': { sm: '700x525', md: '940x705', lg: '940x705', xl: '940x705' },
  '1x1': { sm: '700x700', md: '940x940', lg: '1400x1400', xl: '1400x1400' },
  '3x4': { sm: '700x933', md: '940x1253', lg: '940x1253', xl: '940x1253' }
};
const DEFAULT_RATIOS = {
  sm: '1x1',
  md: '3x2',
  lg: '16x9',
  xl: '16x9'
};
export const PLACEHOLDER_PROPERTY = '--placeholder-image';
const IMAGE_LOAD_RANGE = 1;

const pictures = [];

const Picture = ({ src = SMALLEST_IMAGE, alt = '', isContained = false, ratios = {}, linkUrl = '' }) => {
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
      sources[MQ.SM] = pickRenditionURL(renditions, ratios.sm, 'sm');
      sources[MQ.MD] = pickRenditionURL(renditions, ratios.md, 'md');
      sources[MQ.LANDSCAPE_LT_LG] = pickRenditionURL(renditions, ratios.lg, 'md');
      sources[MQ.LG] = pickRenditionURL(renditions, ratios.lg, 'lg');
      sources[MQ.XL] = pickRenditionURL(renditions, ratios.xl, 'xl');
    }

    alt = imageDoc.alt;
  }

  const placeholderEl = Sizer(ratios);

  const pictureEl = html`<picture
    >${Object.entries(sources).map(
      ([media, srcset]) => html`<source media=${media} srcset=${srcset}></source>`
    )}</picture
  >`;

  const rootEl = html`<a class=${cn('Picture', { 'is-contained': isContained })}>${placeholderEl}${pictureEl}</a>`;

  if (linkUrl) {
    rootEl.setAttribute('href', linkUrl);
  }

  let imgEl = null;

  const picture = {
    getRect: () => {
      // Fixed images should use their parent's rect, as they're always in the viewport
      const position = window.getComputedStyle(rootEl).position;
      const measurableEl = position === 'fixed' ? rootEl.parentElement : rootEl;

      return measurableEl.getBoundingClientRect();
    },
    unload: () => {
      picture.isLoading = false;
      picture.isLoaded = false;
      rootEl.removeAttribute('loading');
      rootEl.removeAttribute('loaded');
      detach(imgEl);
      imgEl = null;
    },
    load: () => {
      if (imgEl) {
        picture.unload();
      }

      picture.isLoading = true;
      rootEl.setAttribute('loading', '');
      imgEl = document.createElement('img');
      imgEl.setAttribute('alt', alt);
      imgEl.addEventListener('load', picture.loaded, false);
      append(pictureEl, imgEl);

      if (!picture.hasPlaceholder) {
        enqueue(function _createAndAddPlaceholderImage() {
          blurImage(src, (err, blurredImageURL) => {
            if (err) {
              return;
            }

            picture.hasPlaceholder = true;
            placeholderEl.style.setProperty(PLACEHOLDER_PROPERTY, `url("${blurredImageURL}")`);
          });
        });
      }
    },
    loaded: () => {
      if (!imgEl) {
        return;
      }

      picture.isLoading = false;
      picture.isLoaded = true;
      rootEl.removeAttribute('loading');
      rootEl.setAttribute('loaded', '');
      imgEl.removeEventListener('load', picture.loaded);

      if (picture.loadedHook) {
        picture.loadedHook(imgEl);
      }
    },
    forget: () => {
      pictures.splice(pictures.indexOf(picture), 1);
    }
  };

  pictures.push(picture);

  rootEl.api = picture;

  if (pictures.length === 1) {
    subscribe(_checkIfPicturesNeedToBeLoaded);
  }

  return rootEl;
};

export default Picture;

function _checkIfPicturesNeedToBeLoaded(client) {
  pictures.forEach(picture => {
    const rect = picture.getRect();
    const isInLoadRange = proximityCheck(rect, client, IMAGE_LOAD_RANGE);

    if (isInLoadRange && !picture.isLoading && !picture.isLoaded) {
      enqueue(function _loadPicture() {
        picture.load();
      });
    } else if (!isInLoadRange && (picture.isLoading || picture.isLoaded)) {
      enqueue(function _unloadPicture() {
        picture.unload();
      });
    }
  });
}

function pickRenditionURL(renditions, preferredRatio, preferredSize) {
  if (!renditions || !renditions.length) {
    return null;
  }

  const renditionsSortedByWidth = [...renditions].sort((a, b) => b.width - a.width);
  const preferredWidth = +SIZES[preferredRatio][preferredSize].split('x')[0];

  return (
    renditionsSortedByWidth.find(({ ratio, width }) => ratio === preferredRatio && width === preferredWidth) ||
    renditionsSortedByWidth.find(({ ratio }) => ratio === preferredRatio) ||
    renditionsSortedByWidth[0]
  ).url;
}
