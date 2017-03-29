// External
const html = require('bel');

// Ours
const {before, detach, select} = require('../../../utils');
const Caption = require('../Caption');

function ImageEmbed({
  playerEl,
  captionEl
}) {
  return html`
    <div class="VideoEmbed u-pull">
      ${playerEl}
      ${captionEl}
    </div>
  `;
};

function transformEl(el) {
  const playerEl = select('.inline-video, .type-video, .comp-video-player', el);

  if (playerEl) {
    const videoEmbedEl = ImageEmbed({
      playerEl,
      captionEl: Caption.createFromEl(el)
    });

    before(el, videoEmbedEl);
    detach(el);
  }
}

module.exports = ImageEmbed;
module.exports.transformEl = transformEl;
