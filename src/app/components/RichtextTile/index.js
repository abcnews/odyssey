import html from 'nanohtml';
import { getMeta } from '../../meta';
import Sizer from '../Sizer';
import styles from './index.lazy.scss';
import { THEME } from '../../../app/constants';

/**
 *
 * @param {Object} args
 * @property {HTMLElement} el
 * @property {Record<string, string>} ratios
 * @returns
 */
const RichtextTile = ({ el, ratios }) => {
  const { isDarkMode } = getMeta();
  const scheme = isDarkMode ? 'dark' : 'light';

  styles.use();

  return html`
    <div class="RichtextTile" data-scheme="${scheme}" data-theme=${THEME}>
      ${Sizer(ratios)}
      <div class="RichtextTile-content u-richtext${isDarkMode ? '-invert' : ''}">${el}</div>
    </div>
  `;
};

export default RichtextTile;
