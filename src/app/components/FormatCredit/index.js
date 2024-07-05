import html from 'nanohtml';
import { track } from '../../utils/behaviour';
import styles from './index.lazy.scss';

const LINK_URL = '/news/interactives/';
const LINK_TRACKER = () => track('format-credit-link', '*');

const FormatCredit = () => {
  styles.use();

  return html`
    <p class="FormatCredit">
      <span>Odyssey format by</span>
      <a class="FormatCredit__tag" href=${LINK_URL} onclick=${LINK_TRACKER}><span>ABC News Story Lab</span></a>
    </p>
  `;
};

export default FormatCredit;
