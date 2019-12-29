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
  subscribe(client => (client.hasChanged ? updateHeightSnapping(el) : null));
  new MutationObserver(() => setTimeout(() => updateHeightSnapping(el), 2000)).observe(el, {
    childList: true
  });

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

function updateHeightSnapping(mainEl) {
  const lastSnappedEls = mainEl.__lastSnappedEls__;

  if (lastSnappedEls) {
    enqueue(() => {
      lastSnappedEls.forEach(el => el.style.removeProperty('min-height'));
    });
  }

  const snappableEls = Array.from(mainEl.children);

  enqueue(() => {
    mainEl.__lastSnappedEls__ = snappableEls;
    snappableEls.forEach(el => {
      const { height } = el.getBoundingClientRect();
      const snap = Math.ceil(height);

      if (height < snap) {
        el.style.setProperty('min-height', `${snap}px`);
      }
    });
  });
}
