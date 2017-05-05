// External
const html = require('bel');
const cmid = require('util-url2cmid');

// Ours
const {select} = require('../../../utils');
const Caption = require('../Caption');
const Gallery = require('../Gallery');
const Picture = require('../Picture');

const registeredImageIds = {};
const images = [];

function MasterGallery() {
  return html`
    <div class="MasterGallery u-richtext-invert">
      ${Gallery({images})}
    </div>
  `;
}

function register(el) {
  const imgEl = select('img', el);

  if (!imgEl) {
    return;
  }

  const src = imgEl.src;
  const id = cmid(src);

  if (!id || registeredImageIds[id]) {
    return;
  }

  registeredImageIds[id] = true;
  
  images.push({
    pictureEl: Picture({
      src: src,
      alt: imgEl.getAttribute('alt'),
      smRatio: '3x4',
      mdRatio: '4x3',
    }),
    captionEl: Caption.createFromEl(el)
  });
}

function transformPlaceholder(placeholder) {
  placeholder.replaceWith(MasterGallery());
}

module.exports = MasterGallery;
module.exports.register = register;
module.exports.transformPlaceholder = transformPlaceholder;
