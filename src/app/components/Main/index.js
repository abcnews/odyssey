import cn from 'classnames';
import html from 'nanohtml';
import { enqueue, subscribe } from '../../scheduler';
import styles from './index.lazy.scss';
import { THEME } from '../../../app/constants';

const Main = (childNodes, meta) => {
  const className = cn('Main', 'u-layout', {
    'u-richtext': !meta.isDarkMode,
    'u-richtext-invert': meta.isDarkMode,
    'has-caption-attributions': meta.hasCaptionAttributions
  });

  const el = html`<main class="${className}" data-scheme="${meta.isDarkMode ? 'dark' : 'light'}" data-theme="${THEME}">
    ${childNodes}
  </main>`;

  subscribe(function _updateMainOffsetTop() {
    enqueue(function _updateMainOffsetTopCustomProp() {
      el.style.setProperty('--Main-offsetTop', Math.round(el.offsetTop) + 'px');
    });
  }, true);

  styles.use();

  return el;
};

export default Main;
