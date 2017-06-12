// External
const html = require('bel');
const picturefill = require('picturefill');

// Ours
const {MQ, SMALLEST_IMAGE, MS_VERSION} = require('../../../constants');
const {select, selectAll} = require('../../../utils');
const {enqueue, subscribe} = require('../../scheduler');
const {blurImage} = require('./blur');

const SIZES = {
  '16x9': {sm: '700x394', md: '940x529', lg: '2150x1210'},
	'3x2': {sm: '700x467', md: '940x627', lg: '940x627'},
	'4x3': {sm: '700x525', md: '940x705', lg: '940x705'},
	'1x1': {sm: '700x700', md: '940x940', lg: '1400x1400'},
	'3x4': {sm: '700x933', md: '940x1253', lg: '940x1253'}
};
const RATIO_PATTERN = /(\d+x\d+)/;
const SM_RATIO_PATTERN = /sm(\d+x\d+)/;
const MD_RATIO_PATTERN = /md(\d+x\d+)/;
const LG_RATIO_PATTERN = /lg(\d+x\d+)/;
const P1_RATIO_SIZE_PATTERN = /(\d+x\d+)-(\d+x\d+)/;
const P2_RATIO_SIZE_PATTERN = /(\d+x\d+)-([a-z]+)/;
const DEFAULTS = {
  SM_RATIO: '1x1',
  MD_RATIO: '3x2',
  LG_RATIO: '16x9'
};
const LOAD_RANGE = .5;

const pictures = [];

function Picture({
  src = SMALLEST_IMAGE,
  alt = '',
  smRatio = DEFAULTS.SM_RATIO,
  mdRatio = DEFAULTS.MD_RATIO,
  lgRatio = DEFAULTS.LG_RATIO,
  preserveOriginalRatio = false,
  linkUrl = ''
}) {
  const [, originalRatio] = src.match(RATIO_PATTERN) || [, null];

  if (preserveOriginalRatio && originalRatio) {
    smRatio = originalRatio;
    mdRatio = originalRatio;
    lgRatio = originalRatio;
  }

  const sizerClassName = `u-sizer-sm-${smRatio} u-sizer-md-${mdRatio} u-sizer-lg-${lgRatio}`;

  const imageURL = src
    .replace(P2_RATIO_SIZE_PATTERN, '$1-large');
  const smImageURL = imageURL
    .replace(RATIO_PATTERN, smRatio)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[smRatio].sm}`);
  const mdImageURL = imageURL
    .replace(RATIO_PATTERN, mdRatio)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[mdRatio].md}`);
  const lgImageURL = imageURL
    .replace(RATIO_PATTERN, lgRatio)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[lgRatio].lg}`);
  const lansdcapeNotLgImageURL = imageURL
    .replace(RATIO_PATTERN, lgRatio)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[lgRatio].md}`);

  const imgEl = html`<img alt="${alt}" data-object-fit="" />`;

  const placeholderEl = html`<div class="${sizerClassName}"></div>`;

  const pictureEl = html`
    <a class="Picture">
      ${placeholderEl}
      <picture>
        <source data-srcset="${lgImageURL}" media="${MQ.LG}" />
        <source data-srcset="${lansdcapeNotLgImageURL}" media="${MQ.LANDSCAPE} and ${MQ.NOT_LG}" />
        <source data-srcset="${mdImageURL}" media="${MQ.MD}" />
        <source data-srcset="${smImageURL}" media="${MQ.SM}" />
        ${imgEl}
      </picture>
    </a>
  `;

  if (linkUrl) {
    pictureEl.href = linkUrl;
  }

  const picture = {
    getRect: () => {
      // Fixed images should use their parent's rect, as they're always in the viewport
      const position = window.getComputedStyle(pictureEl).position;
      const el = (position === 'fixed' ? pictureEl.parentElement : pictureEl);

      return el.getBoundingClientRect();
    },
    load: () => {
      picture.isLoading = true;
      imgEl.addEventListener('load', picture.loaded, false);
      selectAll('source', pictureEl).forEach(sourceEl => {
        sourceEl.setAttribute('srcset', sourceEl.getAttribute('data-srcset'));
      });
      imgEl.setAttribute('loading', '');

      if (!MS_VERSION || MS_VERSION < 13) {
        picturefill({reevaluate: true, elements: [imgEl]});
      }
    },
    loaded: () => {
      picture.isLoaded = true;
      picture.isLoading = false;
      imgEl.removeEventListener('load', picture.loaded);
      imgEl.removeAttribute('loading', '');
      imgEl.setAttribute('loaded', '');

      setTimeout(() => {
        enqueue(function _removePlaceholderImage() {
          placeholderEl.style.removeProperty('--placeholder-image');
        });
      }, 1000);

      if (window.objectFitPolyfill) {
        window.objectFitPolyfill();
      }
    }
  };

  pictures.push(picture);

  enqueue(function _createAndAddPlaceholderImage() {
    blurImage(src, (err, blurredImageURL) => {
      if (err) {
        console.error(err);
        
        return;
      }

      placeholderEl.style.setProperty('--placeholder-image', `url("${blurredImageURL}")`);
    });
  });

  return pictureEl;
};

subscribe(function _checkIfPicturesNeedToBeLoaded(client) {
  pictures.forEach(picture => {
    if (picture.isLoaded || picture.isLoading) {
      return;
    }

    const rect = picture.getRect();

    if (rect.width === 0 && rect.height === 0) {
      return;
    }

    if (
      // Fully covering client
      (rect.top <= 0 && rect.bottom >= client.height) ||
      // Top within load range
      (rect.top >= 0 && rect.top <= client.height * (1 + LOAD_RANGE)) ||
      // Bottom within load range
      (rect.bottom >= client.height * -LOAD_RANGE && rect.bottom <= client.height)
    ) {
      enqueue(function _loadPicture() {
        picture.load();
      });
    }
  });
});

module.exports = Picture;
module.exports.SIZES = SIZES
module.exports.SM_RATIO_PATTERN = SM_RATIO_PATTERN;
module.exports.MD_RATIO_PATTERN = MD_RATIO_PATTERN;
module.exports.LG_RATIO_PATTERN = LG_RATIO_PATTERN;
