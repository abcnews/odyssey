// External
const html = require('bel');
const url2cmid = require('util-url2cmid');

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
    const src = imgEl.src;
    const alt = imgEl.getAttribute('alt');
    const id = url2cmid(src);
    const linkUrl = `/news/${id}`;

    const imageEmbedEl = ImageEmbed({
      pictureEl: Picture({
        src,
        alt,
        smRatio: '3x4',
        mdRatio: '4x3',
        preserveOriginalRatio,
        linkUrl
      }),
      captionEl: Caption.createFromEl(el)
    });

    before(el, imageEmbedEl);
    detach(el);
  }
}

module.exports = ImageEmbed;
module.exports.transformEl = transformEl;
