import cn from 'classnames';
import html from 'bel';
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
    enqueue(function _updateMainOffsetTopCustomProp() {
      el.style.setProperty('--Main-offsetTop', Math.round(el.offsetTop) + 'px');
    });
  }, true);

  return el;
};

export default Main;
