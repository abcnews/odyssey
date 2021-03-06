// External
const { getImages } = require('@abcnews/terminus-fetch');
const html = require('bel');

// Ours
const { MQ, MQL, RATIO_PATTERN, SMALLEST_IMAGE, MS_VERSION } = require('../../../constants');
const { getMeta, lookupImageByAssetURL } = require('../../meta');
const { enqueue, subscribe, unsubscribe } = require('../../scheduler');
const { $, $$, append, detach } = require('../../utils/dom');
const { proximityCheck } = require('../../utils/misc');
const Sizer = require('../Sizer');
const { blurImage } = require('./blur');
require('./index.scss');

const WIDTHS = [700, 940, 1400, 2150];
const SIZES = {
  '16x9': { sm: '700x394', md: '940x529', lg: '2150x1210', xl: '2150x1210' },
  '3x2': { sm: '700x467', md: '940x627', lg: '940x627', xl: '940x627' },
  '4x3': { sm: '700x525', md: '940x705', lg: '940x705', xl: '940x705' },
  '1x1': { sm: '700x700', md: '940x940', lg: '1400x1400', xl: '1400x1400' },
  '3x4': { sm: '700x933', md: '940x1253', lg: '940x1253', xl: '940x1253' }
};
const P1_RATIO_SIZE_PATTERN = /(\d+x\d+)-(\d+x\d+)/;
const P2_RATIO_SIZE_PATTERN = /(\d+x\d+)-([a-z]+)/;
const DEFAULT_RATIOS = {
  sm: '1x1',
  md: '3x2',
  lg: '16x9',
  xl: '16x9'
};
const PLACEHOLDER_PROPERTY = '--placeholder-image';
const IMAGE_LOAD_RANGE = 1;

const pictures = [];

function Picture({ src = SMALLEST_IMAGE, alt = '', isContained = false, ratios = {}, linkUrl = '' }) {
  const imageDoc = lookupImageByAssetURL(src); // Will only work if image's document was catalogued during initMeta

  ratios = {
    sm: ratios.sm || DEFAULT_RATIOS.sm,
    md: ratios.md || DEFAULT_RATIOS.md,
    lg: ratios.lg || DEFAULT_RATIOS.lg,
    xl: ratios.xl || DEFAULT_RATIOS.xl
  };

  // Defaults for image of unknown origin
  let smImageURL = src;
  let mdImageURL = src;
  let lansdcapeLtLgImageURL = src;
  let lgImageURL = src;
  let xlImageURL = src;

  if (imageDoc) {
    alt = imageDoc.alt;

    if (imageDoc.media.image.primary.binaryKey) {
      // CM10 Image document
      const { renditions } = getImages(imageDoc, WIDTHS);

      smImageURL = getMostSuitableRenditionURL(renditions, ratios.sm, 'sm') || smImageURL;
      mdImageURL = getMostSuitableRenditionURL(renditions, ratios.md, 'md') || mdImageURL;
      lansdcapeLtLgImageURL = getMostSuitableRenditionURL(renditions, ratios.lg, 'md') || lansdcapeLtLgImageURL;
      lgImageURL = getMostSuitableRenditionURL(renditions, ratios.lg, 'lg') || lgImageURL;
      xlImageURL = getMostSuitableRenditionURL(renditions, ratios.xl, 'xl') || xlImageURL;
    } else {
      // CM5 Image document
      smImageURL = resizeCM5ImageURL(src, ratios.sm, 'sm');
      mdImageURL = resizeCM5ImageURL(src, ratios.md, 'md');
      lansdcapeLtLgImageURL = resizeCM5ImageURL(src, ratios.lg, 'md');
      lgImageURL = resizeCM5ImageURL(src, ratios.lg, 'lg');
      xlImageURL = resizeCM5ImageURL(src, ratios.xl, 'xl');
    }
  }

  const placeholderEl = Sizer(ratios);

  // The <img> element will be rendered inside a container element because:
  // * We want to use <picture> where possible to automatically manage sources
  //   (based on the viewport size)
  // * The object-fit polyfill needs a container so that it can manipulate the
  //   style attributes of both it and the image.
  // Note: We cannot use <picture> & <source>s on PL preview sites, because
  // `imageset`s aren't allowed Mixed Content (http asset loaded on https page).
  // We have to manually manage the <img> src attribute sources to work around
  // this. Seeing as this does a similar job to the <picture> element, we also
  // use this technique for IE, rather than add the picturefill library.
  // https://snook.ca/archives/html_and_css/mixed-content-responsive-images
  const { isPL, isPreview } = getMeta();
  const isManagingSources = (isPL && isPreview) || (MS_VERSION && MS_VERSION < 13);

  const imgContainerEl = isManagingSources
    ? html` <div></div> `
    : html`
        <picture>
          <source srcset="${xlImageURL}" media="${MQ.XL}" />
          <source srcset="${lgImageURL}" media="${MQ.LG}" />
          <source srcset="${lansdcapeLtLgImageURL}" media="${MQ.LANDSCAPE_LT_LG}" />
          <source srcset="${mdImageURL}" media="${MQ.MD}" />
          <source srcset="${smImageURL}" media="${MQ.SM}" />
        </picture>
      `;

  const pictureEl = html`
    <a class="Picture${isContained ? ' is-contained' : ''}"> ${placeholderEl} ${imgContainerEl} </a>
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

      if (isManagingSources) {
        unsubscribe(picture.setSrc);
      }
    },
    load: () => {
      if (imgEl) {
        picture.unload();
      }

      picture.isLoading = true;
      pictureEl.setAttribute('loading', '');
      imgEl = html` <img alt="${alt}" data-object-fit="" /> `;
      imgEl.addEventListener('load', picture.loaded, false);
      append(imgContainerEl, imgEl);

      if (isManagingSources) {
        picture.setSrc({ hasChanged: true });
        subscribe(picture.setSrc);
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
    setSrc: ({ hasChanged }) => {
      if (!imgEl || !hasChanged) {
        return;
      }

      if (MQL.XL.matches) {
        imgEl.src = xlImageURL;
      } else if (MQL.LG.matches) {
        imgEl.src = lgImageURL;
      } else if (MQL.LANDSCAPE_LT_LG.matches) {
        imgEl.src = lansdcapeLtLgImageURL;
      } else if (MQL.MD.matches) {
        imgEl.src = mdImageURL;
      } else if (MQL.SM.matches) {
        imgEl.src = smImageURL;
      }
    },
    forget: () => {
      pictures.splice(pictures.indexOf(picture), 1);
    }
  };

  pictures.push(picture);

  pictureEl.api = picture;

  if (pictures.length === 1) {
    subscribe(_checkIfPicturesNeedToBeLoaded);
    subscribe(_checkIfObjectFitPolyfillNeedsToRun, true);
  }

  return pictureEl;
}

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

function _checkIfObjectFitPolyfillNeedsToRun() {
  if (window.objectFitPolyfill) {
    window.objectFitPolyfill();
  }
}

module.exports = Picture;

module.exports.PLACEHOLDER_PROPERTY = PLACEHOLDER_PROPERTY;

function resizeCM5ImageURL(url, ratio = '16x9', size = 'md') {
  return ensurePhase1Asset(url)
    .replace(RATIO_PATTERN, ratio)
    .replace(P1_RATIO_SIZE_PATTERN, `$1-${SIZES[ratio][size]}`);
}

function ensurePhase1Asset(url) {
  const match = url.match(P2_RATIO_SIZE_PATTERN);

  if (!match) {
    return url;
  }

  return url.split('?')[0].replace('cm/r', 'news/').replace(match[1], '16x9').replace(match[2], SIZES['16x9'].md);
}

function getMostSuitableRenditionURL(renditions, preferredRatio, preferredSize) {
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
