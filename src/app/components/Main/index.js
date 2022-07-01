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
