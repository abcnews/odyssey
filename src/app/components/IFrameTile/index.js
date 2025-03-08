import html from 'nanohtml';
import { getMeta } from '../../meta';
import Sizer from '../Sizer';
import styles from './index.lazy.scss';
import { THEME } from '../../../app/constants';
import { invalidateClient } from '../../../app/scheduler';

const IFrameTile = ({ el, ratios }) => {
  const { isDarkMode } = getMeta();
  const scheme = isDarkMode ? 'dark' : 'light';

  setInterval(invalidateClient, 1000);

  styles.use();

  return html`
    <div class="IFrameTile" data-scheme="${scheme}" data-theme=${THEME}>
      ${Sizer(ratios)}
      <div class="IFrameTile-content u-richtext${isDarkMode ? '-invert' : ''}">${el}</div>
    </div>
  `;
};

export default IFrameTile;
