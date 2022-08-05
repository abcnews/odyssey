import html from 'nanohtml';
import ShareLink from '../ShareLink';
import styles from './index.lazy.scss';

const ShareLinks = ({ links, shouldBlend }) => {
  styles.use();

  return html`<div class="ShareLinks">${links.map(link => ShareLink({ link, shouldBlend }))}</div>`;
};

export default ShareLinks;
