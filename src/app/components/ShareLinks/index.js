// External
import html from 'bel';

// Ours
import ShareLink from '../ShareLink';
import './index.scss';

function ShareLinks({ links, shouldBlend }) {
  return html`
    <div class="ShareLinks">${links.map(link => ShareLink({ link, shouldBlend }))}</div>
  `;
}

export default ShareLinks;
