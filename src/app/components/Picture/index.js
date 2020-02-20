// External
const html = require('bel');
const picturefill = require('picturefill/dist/picturefill.min');

// Ours
const { MQ, RATIO_PATTERN, SMALLEST_IMAGE, MS_VERSION } = require('../../../constants');
const { enqueue, subscribe } = require('../../scheduler');
const { $, $$, append, detach } = require('../../utils/dom');
const { proximityCheck } = require('../../utils/misc');
const Sizer = require('../Sizer');
const { blurImage } = require('./blur');
require('./index.scss');

const SIZES = {
  '16x9': { sm: '700x394', md: '940x529', lg: '2150x1210', xl: '2150x1210' },
  '3x2': { sm: '700x467', md: '940x627', lg: '940x627', xl: '940x627' },
  '4x3': { sm: '700x525', md: '940x705', lg: '940x705', xl: '940x705' },
  '1x1': { sm: '700x700', md: '940x940', lg: '1400x1400', xl: '1400x1400' },
  '3x4': { sm: '700x933', md: '940x1253', lg: '940x1253', xl: '940x1253' }
};

const P1_RATIO_SIZE_PATTERN = /(\d+x\d+)-(\d+x\d+)/;
const P2_RATIO_SIZE_PATTERN = /(\d+x\d+)-([a-z]+)/;
const DEFAULTS = {
  SM_RATIO: '1x1',
  MD_RATIO: '3x2',
  LG_RATIO: '16x9',
  XL_RATIO: '16x9'
};
const PLACEHOLDER_PROPERTY = '--placeholder-image';
const IMAGE_LOAD_RANGE = 1;

const pictures = [];

function Picture({
  src = SMALLEST_IMAGE,
  alt = '',
  isContained = false,
  ratios = {},
  preserveOriginalRatio = false,
  linkUrl = ''
}) {
  const [, originalRatio] = src.match(RATIO_PATTERN) || [, null];

  ratios =
    preserveOriginalRatio && originalRatio
      ? {
          sm: originalRatio,
          md: originalRatio,
          lg: originalRatio,
          xl: originalRatio
        }
      : {
          sm: ratios.sm || DEFAULTS.SM_RATIO,
          md: ratios.md || DEFAULTS.MD_RATIO,
          lg: ratios.lg || DEFAULTS.LG_RATIO,
          xl: ratios.xl || DEFAULTS.XL_RATIO
        };

  const imageURL = ensurePhase1Asset(src);
  const smImageURL = imageURL
    .replace(RATIO_PATTERN, ratios.sm)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[ratios.sm].sm}`);
  const mdImageURL = imageURL
    .replace(RATIO_PATTERN, ratios.md)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[ratios.md].md}`);
  const lansdcapeLtLgImageURL = imageURL
    .replace(RATIO_PATTERN, ratios.lg)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[ratios.lg].md}`);
  const lgImageURL = imageURL
    .replace(RATIO_PATTERN, ratios.lg)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[ratios.lg].lg}`);
  const xlImageURL = imageURL
    .replace(RATIO_PATTERN, ratios.xl)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[ratios.xl].xl}`);

  const placeholderEl = Sizer(ratios);

  const picturePictureEl = html`
    <picture>
      <source srcset="${xlImageURL}" media="${MQ.XL}" />
      <source srcset="${lgImageURL}" media="${MQ.LG}" />
      <source srcset="${lansdcapeLtLgImageURL}" media="${MQ.LANDSCAPE} and ${MQ.LT_LG}" />
      <source srcset="${mdImageURL}" media="${MQ.MD}" />
      <source srcset="${smImageURL}" media="${MQ.SM}" />
    </picture>
  `;

  const pictureEl = html`
    <a class="Picture${isContained ? ' is-contained' : ''}"> ${placeholderEl} ${picturePictureEl} </a>
  `;

  if (linkUrl) {
    pictureEl.href = linkUrl;
  }

  let imgEl = null;

  const picture = {
    getRect: () => {
      // Fixed images should use their parent's rect, as they're always in the viewport
      const position = window.getComputedStyle(pictureEl).position;
      const el = position === 'fixed' ? pictureEl.parentElement : pictureEl;

      return el.getBoundingClientRect();
    },
    unload: () => {
      picture.isLoading = false;
      picture.isLoaded = false;
      pictureEl.removeAttribute('loading');
      pictureEl.removeAttribute('loaded');
      detach(imgEl);
      imgEl = null;
    },
    load: () => {
      if (imgEl) {
        picture.unload();
      }

      picture.isLoading = true;
      pictureEl.setAttribute('loading', '');
      imgEl = html`
        <img alt="${alt}" data-object-fit="" />
      `;
      imgEl.addEventListener('load', picture.loaded, false);
      append(picturePictureEl, imgEl);

      if (MS_VERSION && MS_VERSION < 13) {
        picturefill({ elements: [imgEl] });
      }

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
      pictureEl.removeAttribute('loading');
      pictureEl.setAttribute('loaded', '');
      imgEl.removeEventListener('load', picture.loaded);

      if (picture.loadedHook) {
        picture.loadedHook(imgEl);
      }

      if (window.objectFitPolyfill) {
        window.objectFitPolyfill(imgEl);
      }
    },
    forget: () => {
      pictures.splice(pictures.indexOf(picture), 1);
    }
  };

  pictures.push(picture);

  pictureEl.api = picture;

  return pictureEl;
}

subscribe(function _checkIfPicturesNeedToBeLoaded(client) {
  pictures.forEach(picture => {
    const rect = picture.getRect();
    const isInLoadRange = proximityCheck(rect, client, IMAGE_LOAD_RANGE);

    if (isInLoadRange && !picture.isLoading && !picture.isLoaded) {
      enqueue(function _loadPicture() {
        picture.load();
      });
    } else if (!isInLoadRange && (picture.isLoading || picture.isLoaded)) {
      enqueue(function _loadPicture() {
        picture.unload();
      });
    }
  });
});

subscribe(function _checkIfObjectFitPolyfillNeedsToRun(client) {
  if (window.objectFitPolyfill && client.hasChanged) {
    window.objectFitPolyfill();
  }
});

module.exports = Picture;

module.exports.PLACEHOLDER_PROPERTY = PLACEHOLDER_PROPERTY;

module.exports.resize = ({ url = '', ratio = '16x9', size = 'md' }) =>
  ensurePhase1Asset(url)
    .replace(RATIO_PATTERN, ratio)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[ratio][size]}`);

function ensurePhase1Asset(url) {
  const match = url.match(P2_RATIO_SIZE_PATTERN);

  if (!match) {
    return url;
  }

  return url
    .split('?')[0]
    .replace('cm/r', 'news/')
    .replace(match[1], '16x9')
    .replace(match[2], SIZES['16x9'].md);
}
