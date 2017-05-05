// External
const html = require('bel');
const cmid = require('util-url2cmid');

// Ours
const {select} = require('../../../utils');
const Caption = require('../Caption');
const Gallery = require('../Gallery');
const Picture = require('../Picture');

const images = {};

function MasterGallery() {
  console.log(images);
  return html`
    <div class="MasterGallery u-richtext-invert">
      ${Gallery({images: Object.keys(images).map(key => images[key])})}
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

  if (!id || images[id]) {
    return;
  }

  images[id] = {
    pictureEl: Picture({
      src: src,
      alt: imgEl.getAttribute('alt'),
      smRatio: '3x4',
      mdRatio: '4x3',
    }),
    captionEl: Caption.createFromEl(el)
  };
}

function transformPlaceholder(placeholder) {
  placeholder.replaceWith(MasterGallery());
}

module.exports = MasterGallery;
module.exports.register = register;
module.exports.transformPlaceholder = transformPlaceholder;
