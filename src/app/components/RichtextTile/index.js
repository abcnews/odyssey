import html from 'nanohtml';
import { getMeta } from '../../meta';
import Sizer from '../Sizer';
import styles from './index.lazy.scss';

const RichtextTile = (el, ratios) => {
  const { isDarkMode } = getMeta();

  styles.use();

  return html`
    <div class="RichtextTile">
      ${Sizer(ratios)}
      <div class="RichtextTile-content u-richtext${isDarkMode ? '-invert' : ''}">${el}</div>
    </div>
  `;
};

export default RichtextTile;
