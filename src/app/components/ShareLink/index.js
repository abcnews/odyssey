// External
import html from 'bel';

// Ours
import { track } from '../../utils/behaviour';
import './index.scss';

function ShareLink({ link, shouldBlend }) {
  return html`
    <a
      class="ShareLink ShareLink--${link.id}${shouldBlend ? ' u-blend-luminosity' : ''}"
      href="${link.href}"
      onclick="${() => track('share-link', link.id)}"
      aria-label="Share this story via ${link.id}"
    ></a>
  `;
}

export default ShareLink;
