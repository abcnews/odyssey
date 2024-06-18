import html from 'nanohtml';
import { track } from '../../utils/behaviour';
import { $ } from '../../utils/dom';
import { getMeta } from '../../meta';
import { subscribe, unsubscribe } from '../../scheduler';
import styles from './index.lazy.scss';

const SharePopover = ({ links, onClose }) => {
  styles.use();

  return html`
    <div class="SharePopover">
      <div class="SharePopoverContent">
        ${CrossButton(onClose)}
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
}

export default SharePopover;

const PATHS = {
  email: '',
  facebook:
    'M9.668 21h3.335v-8.996h2.502L16 9.194h-2.997V7.157c0-.759.309-1.346 1.26-1.346h1.494V3h-2.088c-3.24.013-4 1.99-3.995 3.937l-.006 2.257H8v2.81h1.668V21Z',
  native: '',
  linkedin:
    'M16.529 8.677c3.774 0 4.471 2.49 4.471 5.73V21h-3.727v-5.847c0-1.395-.027-3.188-1.939-3.188-1.94 0-2.236 1.519-2.236 3.086V21H9.372V8.977h3.574v1.641h.052c.498-.944 1.716-1.94 3.53-1.94Zm-9.498.3V21H3.296V8.977h3.735ZM5.164 3a2.165 2.165 0 0 1 0 4.332A2.164 2.164 0 0 1 3 5.165C3 3.97 3.967 3 5.164 3Z',
  twitter:
    'M13.317 10.775 19.146 4h-1.381l-5.061 5.883L8.662 4H4l6.112 8.896L4 20h1.381l5.344-6.212L14.994 20h4.662l-6.339-9.225ZM5.88 5.04H8l9.765 13.968h-2.121L5.879 5.04Z'
};

const LABELS = {
  email: '',
  facebook: 'Facebook',
  native: '',
  linkedin: '',
  twitter: 'X (formerly Twitter)'
};

const ShareLink = ({ link }) => {
  if (link.id === 'native') {
    return html`
      <li>
        <button class="ShareLink" data-id=${link.id} onclick="${() => native(link)}" aria-label="Share this story">
          ${ShareLinkIcon(link.id)}
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
        ${ShareLinkIcon(link.id)} <span>${LABELS[link.id]}</span>
      </a>
    </li>
  `;
};

const ShareLinkIcon = id => {
  return html`
    <svg class="ShareLinkIcon" width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="${PATHS[id]}" />
    </svg>
  `;
};

const CrossButton = (cb) => {
  return html`
    <button class="SharePopoverCrossButton" onclick="${() => cb()}">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="1em" height="1em" data-component="Close" aria-hidden="true">
        <path stroke="currentColor" stroke-width="2" d="M19 19 5 5" />
        <path stroke="currentColor" stroke-width="2" d="M5 19 19 5" />
      </svg>
    </button>
  `;
}

async function trackShare(socialNetwork) {
  const { url } = await getMeta();
  dataLayer.event('share', { socialNetwork, url });
}

function native({ id, url, title, description }) {
  navigator.share({ text: description, title, url }).then(() => trackShare(id));
}

