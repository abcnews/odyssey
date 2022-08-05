import html from 'nanohtml';
import { track } from '../../utils/behaviour';
import styles from './index.lazy.scss';

function native({ id, url, title, description }) {
  navigator.share({ text: description, title, url }).then(() => track('share-link', id));
}

const ShareLink = ({ link, shouldBlend }) => {
  const className = `ShareLink ShareLink--${link.id}${shouldBlend ? ' u-blend-luminosity' : ''}`;

  styles.use();

  if (link.id === 'native') {
    return html`<button class="${className}" onclick="${() => native(link)}" aria-label="Share this story"></button>`;
  }

  return html`
    <a
      class="${className}"
      href="${link.url}"
      onclick="${() => track('share-link', link.id)}"
      aria-label="Share this story via ${link.id}"
    ></a>
  `;
};

export default ShareLink;
