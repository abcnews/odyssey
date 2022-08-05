import html from 'nanohtml';
import { track } from '../../utils/behaviour';
import styles from './index.lazy.scss';

const LINK_URL = '/news/interactives/';
const LINK_TRACKER = () => track('format-credit-link', '*');

const FormatCredit = () => {
  styles.use();

  return html`
    <div class="FormatCredit">
      <p>
        <span>Odyssey format by </span>
        <a href=${LINK_URL} onclick=${LINK_TRACKER}>ABC News Story Lab</a>
      </p>
    </div>
  `;
};

export default FormatCredit;
