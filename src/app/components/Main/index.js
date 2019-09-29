// External
const cn = require('classnames');
const html = require('bel');

// Ours
const { $ } = require('../../utils/dom');
const { enqueue, subscribe } = require('../../scheduler');
require('./index.scss');

module.exports = function Main(childNodes, meta) {
  const className = cn('Main', 'u-layout', {
    'u-richtext': !meta.isDarkMode,
    'u-richtext-invert': meta.isDarkMode,
    'has-caption-attributions': meta.hasCaptionAttributions
  });

  const el = html`
    <main class="${className}">${childNodes}</main>
  `;

  subscribe(client => (client.hasChanged ? updateOffsetTop(el) : null));

  return el;
};

function updateOffsetTop(mainEl) {
  let previewContainerHeight = 0;
  const previewContainerEl = $('.preview-container');

  if (previewContainerEl) {
    previewContainerHeight = previewContainerEl.getBoundingClientRect().height;
  }

  enqueue(() => {
    mainEl.style.setProperty('--Main-offsetTop', Math.round(mainEl.offsetTop - previewContainerHeight) + 'px');
  });
}
