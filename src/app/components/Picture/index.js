// External
const html = require('bel');
const picturefill = require('picturefill');

// Ours
const {MQ, RATIO_PATTERN, SMALLEST_IMAGE, MS_VERSION} = require('../../../constants');
const {enqueue, subscribe} = require('../../scheduler');
const {$, $$, append, detach} = require('../../utils/dom');
const {proximityCheck} = require('../../utils/misc');
const {blurImage} = require('./blur');

const SIZES = {
  '16x9': {sm: '700x394', md: '940x529', lg: '2150x1210'},
	'3x2': {sm: '700x467', md: '940x627', lg: '940x627'},
	'4x3': {sm: '700x525', md: '940x705', lg: '940x705'},
	'1x1': {sm: '700x700', md: '940x940', lg: '1400x1400'},
	'3x4': {sm: '700x933', md: '940x1253', lg: '940x1253'}
};

const P1_RATIO_SIZE_PATTERN = /(\d+x\d+)-(\d+x\d+)/;
const P2_RATIO_SIZE_PATTERN = /(\d+x\d+)-([a-z]+)/;
const DEFAULTS = {
  SM_RATIO: '1x1',
  MD_RATIO: '3x2',
  LG_RATIO: '16x9'
};
const PLACEHOLDER_PROPERTY = '--placeholder-image';
const IMAGE_LOAD_RANGE = 1;

const pictures = [];

function Picture({
  src = SMALLEST_IMAGE,
  alt = '',
  ratios = {},
  preserveOriginalRatio = false,
  linkUrl = ''
}) {
  const [, originalRatio] = src.match(RATIO_PATTERN) || [, null];

  ratios = preserveOriginalRatio && originalRatio ? {
    sm: originalRatio,
    md: originalRatio,
    lg: originalRatio
  } : {
    sm: ratios.sm || DEFAULTS.SM_RATIO,
    md: ratios.md || DEFAULTS.MD_RATIO,
    lg: ratios.lg || DEFAULTS.LG_RATIO
  };

  const sizerClassName = `u-sizer-sm-${ratios.sm} u-sizer-md-${ratios.md} u-sizer-lg-${ratios.lg}`;

  const imageURL = src
    .replace(P2_RATIO_SIZE_PATTERN, '$1-large');
  const smImageURL = imageURL
    .replace(RATIO_PATTERN, ratios.sm)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[ratios.sm].sm}`);
  const mdImageURL = imageURL
    .replace(RATIO_PATTERN, ratios.md)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[ratios.md].md}`);
  const lgImageURL = imageURL
    .replace(RATIO_PATTERN, ratios.lg)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[ratios.lg].lg}`);
  const lansdcapeNotLgImageURL = imageURL
    .replace(RATIO_PATTERN, ratios.lg)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[ratios.lg].md}`);

  const placeholderEl = html`<div class="${sizerClassName}"></div>`;

  const picturePictureEl = html`
    <picture>
      <source srcset="${lgImageURL}" media="${MQ.LG}" />
      <source srcset="${lansdcapeNotLgImageURL}" media="${MQ.LANDSCAPE} and ${MQ.NOT_LG}" />
      <source srcset="${mdImageURL}" media="${MQ.MD}" />
      <source srcset="${smImageURL}" media="${MQ.SM}" />
    </picture>
  `;

  const pictureEl = html`
    <a class="Picture">
      ${placeholderEl}
      ${picturePictureEl}
    </a>
  `;

  if (linkUrl) {
    pictureEl.href = linkUrl;
  }

  let imgEl = null;

  const picture = {
    getRect: () => {
      // Fixed images should use their parent's rect, as they're always in the viewport
      const position = window.getComputedStyle(pictureEl).position;
      const el = (position === 'fixed' ? pictureEl.parentElement : pictureEl);

      return el.getBoundingClientRect();
    },
    unload: () => {
      picture.isLoaded = false;
      picture.isLoading = false;
      pictureEl.removeAttribute('loaded', '');
      detach(imgEl);
      imgEl = null;
    },
    load: () => {
      if (imgEl) {
        picture.unload();
      }

      picture.isLoading = true;
      imgEl = html`<img alt="${alt}" data-object-fit="" />`;
      imgEl.addEventListener('load', picture.loaded, false);
      append(picturePictureEl, imgEl);

      if (MS_VERSION && MS_VERSION < 13) {
        picturefill({elements: [imgEl]});
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
      pictureEl.setAttribute('loaded', '');
      imgEl.removeEventListener('load', picture.loaded);

      if (picture.loadedHook) {
        picture.loadedHook(imgEl);
      }

      if (window.objectFitPolyfill) {
        window.objectFitPolyfill();
      }
    },
    forget: () => {
      pictures.splice(pictures.indexOf(picture), 1);
    }
  };

  pictures.push(picture);

  pictureEl.api = picture;

  return pictureEl;
};

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

module.exports = Picture;
