// External
const html = require('bel');

// Ours
const {before, detach, select} = require('../../../utils');
const Caption = require('../Caption');
const Picture = require('../Picture');

function ImageEmbed({
  pictureEl,
  captionEl
}) {
  return html`
    <div class="ImageEmbed u-pull">
      ${pictureEl}
      ${captionEl}
    </div>
  `;
};

function transformEl(el, preserveOriginalRatio) {
  const imgEl = select('img', el);

  if (imgEl) {
    const imageEmbedEl = ImageEmbed({
      pictureEl: Picture({
        src: imgEl.src,
        alt: imgEl.getAttribute('alt'),
        smRatio: '3x4',
        mdRatio: '4x3',
        preserveOriginalRatio
      }),
      captionEl: Caption.createFromEl(el)
    });

    before(el, imageEmbedEl);
    detach(el);
  }
}

module.exports = ImageEmbed;
module.exports.transformEl = transformEl;
