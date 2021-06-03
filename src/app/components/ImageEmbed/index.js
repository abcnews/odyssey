// External
const cn = require('classnames');
const html = require('bel');
const { url2cmid } = require('@abcnews/url2cmid');

// Ours
const { ALIGNMENT_PATTERN, IMAGE_MARKER_PATTERN } = require('../../../constants');
const { lookupImageByAssetURL, registerExternalImage } = require('../../meta');
const { terminusFetch } = require('../../utils/content');
const { getChildImage, substitute } = require('../../utils/dom');
const { getRatios } = require('../../utils/misc');
const { grabPrecedingConfigString } = require('../../utils/mounts');
const Caption = require('../Caption');
const Picture = require('../Picture');
require('./index.scss');

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

  return html` <div class="${className}">${pictureEl} ${isAnon ? null : captionEl}</div> `;
}

function transformEl(el, preserveOriginalRatio) {
  const imgEl = getChildImage(el);

  if (!imgEl) {
    return;
  }

  const src = imgEl.src;
  const imageDoc = lookupImageByAssetURL(src);

  if (!imageDoc || imageDoc.media.image.primary.complete.length < 2) {
    // Custom Images appear to be Images in Terminus V2. We should ignore them.
    return;
  }

  const configString = grabPrecedingConfigString(el);
  const [, alignment] = configString.match(ALIGNMENT_PATTERN) || [];
  const ratios = getRatios(configString);
  const unlink = configString.includes('unlink');
  const alt = imgEl.getAttribute('alt');

  const imageEmbedEl = ImageEmbed({
    pictureEl: Picture({
      src,
      alt,
      ratios: {
        sm: ratios.sm || '3x4',
        md: ratios.md || '4x3',
        lg: ratios.lg,
        xl: ratios.xl
      },
      linkUrl: `/news/${imageDoc.id}`
    }),
    captionEl: Caption.createFromTerminusDoc(imageDoc, unlink),
    alignment,
    isFull: configString.indexOf('full') > -1,
    isCover: configString.indexOf('cover') > -1,
    isAnon: configString.indexOf('anon') > -1
  });

  substitute(el, imageEmbedEl);
}

function transformMarker(marker) {
  const [, imageId] = `${marker.name}${marker.configString}`.match(IMAGE_MARKER_PATTERN) || [];

  if (!imageId) {
    return;
  }

  const configString = grabPrecedingConfigString(marker.node);
  const [, alignment] = configString.match(ALIGNMENT_PATTERN) || [];
  const ratios = getRatios(configString);

  terminusFetch({ id: imageId, type: 'image' }, (err, item) => {
    if (err) {
      return done(err);
    }

    registerExternalImage(item); // So Picture can find it by src

    const pictureEl = Picture({
      src: item.media.image.primary.complete[0].url,
      alt: item.alt,
      ratios: {
        sm: ratios.sm || '3x4',
        md: ratios.md || '4x3',
        lg: ratios.lg,
        xl: ratios.xl
      }
    });

    const imageEmbedEl = ImageEmbed({
      pictureEl,
      captionEl: Caption.createFromTerminusDoc(item, true),
      alignment,
      isFull: configString.indexOf('full') > -1,
      isCover: configString.indexOf('cover') > -1,
      isAnon: configString.indexOf('anon') > -1
    });

    substitute(marker.node, imageEmbedEl);
    pictureEl.api.load(); // In case this is above the fold and no scrolling has occurred
  });
}

module.exports = ImageEmbed;
module.exports.transformEl = transformEl;
module.exports.transformMarker = transformMarker;
