import html from 'nanohtml';
import ShareLink from '../ShareLink';
import './index.scss';

const ShareLinks = ({ links, shouldBlend }) => {
  return html`<div class="ShareLinks">${links.map(link => ShareLink({ link, shouldBlend }))}</div>`;
};

export default ShareLinks;
