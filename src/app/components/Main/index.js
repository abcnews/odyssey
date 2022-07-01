import cn from 'classnames';
import html from 'bel';
import { $ } from '../../utils/dom';
import { enqueue, subscribe } from '../../scheduler';
import './index.scss';

const Main = (childNodes, meta) => {
  const className = cn('Main', 'u-layout', {
    'u-richtext': !meta.isDarkMode,
    'u-richtext-invert': meta.isDarkMode,
    'has-caption-attributions': meta.hasCaptionAttributions
  });

  const el = html`<main class="${className}">${childNodes}</main>`;

  subscribe(function _updateMainOffsetTop() {
    updateOffsetTop(el);
  }, true);
  subscribe(function _updateHeightSnapping() {
    updateHeightSnapping(el);
  }, true);
  new MutationObserver(() => setTimeout(() => updateHeightSnapping(el), 2000)).observe(el, {
    childList: true
  });

  return el;
};

export default Main;

function updateOffsetTop(mainEl) {
  let previewContainerHeight = 0;
  const previewContainerEl = $('.preview-container');

  if (previewContainerEl) {
    previewContainerHeight = previewContainerEl.getBoundingClientRect().height;
  }

  enqueue(function _updateMainOffsetTopCustomProp() {
    mainEl.style.setProperty('--Main-offsetTop', Math.round(mainEl.offsetTop - previewContainerHeight) + 'px');
  });
}

function updateHeightSnapping(mainEl) {
  const snappableEls = Array.from(mainEl.children);
  const lastSnappedEls = mainEl.__lastSnappedEls__;

  if (lastSnappedEls) {
    enqueue(function _unsnapLastSnappedMainChildrenHeights() {
      lastSnappedEls.forEach(el => el.style.removeProperty('min-height'));
    });
  }

  enqueue(function _snapMainChildrenHeights() {
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
