import html from 'nanohtml';
import { analyticsEvent, track } from '../../utils/behaviour';
import { $ } from '../../utils/dom';
import { getMeta } from '../../meta';
import { subscribe, unsubscribe } from '../../scheduler';
import styles from './index.lazy.scss';

import Icon from '../Icon';

const SharePopover = ({ links, onClose }) => {
  styles.use();

  return html`
    <div class="SharePopover">
      <div class="SharePopoverContent">
        <button class="SharePopoverCrossButton" onclick="${onClose}">${Icon('cross')}</button>
        <div class="ShareLinks">
          <h3>Share this on</h3>
          <ul class="ShareLinkList">
            ${links.map(link => ShareLink({ link }))}
          </ul>
        </div>
      </div>
      <div class="PopoverStick" />
    </div>
  `;
};

const ShareLink = ({ link }) => {
  if (link.id === 'native') {
    return html`
      <li>
        <button class="ShareLink" data-id=${link.id} onclick="${() => native(link)}" aria-label="Share this story">
          ${Icon(link.id)}
        </button>
      </li>
    `;
  }

  let hdl;
  const copyToClipboard = async link => {
    trackShare(link.id);

    try {
      await navigator.clipboard.writeText(link.url);

      $('.ShareLink.Copy svg')?.replaceWith(Icon('tick'));
      $('.ShareLink.Copy span')?.replaceWith(html`<span>Copied</span>`);

      clearTimeout(hdl);
      hdl = setTimeout(() => {
        $('.ShareLink.Copy svg')?.replaceWith(Icon('link'));
        $('.ShareLink.Copy span')?.replaceWith(html`<span>Copy</span>`);
      }, 1500);
    } catch (err) {}
  };

  if (link.id === 'copylink') {
    return html`
      <li>
        <button class="ShareLink Copy" data-id=${link.id} onclick="${() => copyToClipboard(link)}">
          ${Icon(link.id)} <span>${LABELS[link.id]}</span>
        </button>
      </li>
    `;
  }

  return html`
    <li>
      <a
        class="ShareLink"
        data-id=${link.id}
        href="${link.url}"
        onclick="${() => trackShare(link.id)}"
        aria-label="Share this story via ${link.id}"
      >
        ${Icon(link.id)} <span>${LABELS[link.id]}</span>
      </a>
    </li>
  `;
};

export default SharePopover;

const LABELS = {
  email: '',
  facebook: 'Facebook',
  native: '',
  copylink: 'Copy',
  linkedin: '',
  twitter: 'X (formerly Twitter)'
};

export async function trackShare(socialNetwork) {
  const { url } = await getMeta();
  analyticsEvent('share', { socialNetwork, url });
}

function native({ id, url, title, description }) {
  navigator.share({ text: description, title, url }).then(() => trackShare(id));
}
