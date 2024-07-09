// @ts-check
import html from 'nanohtml';
import { track } from '../../utils/behaviour';
import { proximityCheck } from '../../utils/misc';
import { $ } from '../../utils/dom';
import { getMeta } from '../../meta';
import { subscribe, unsubscribe } from '../../scheduler';
import ShareLinksLegacy from '../legacy/ShareLinks';
import SharePopover, { trackShare } from '../SharePopover';
import Icon from '../Icon';
import styles from './index.lazy.scss';

const DEFAULT_TYPE = 'story';
const INVITATION_RANGE = 0;
const UPPERCASE_PATTERN = /[A-Z]/g;

const instances = [];

const Share = ({ type, links }) => {
  if (links.length === 0) {
    return html`<div data-error="No share links to render"></div>`;
  }
  styles.use();

  const { isFuture, url } = getMeta();

  let hdl;
  const copyToClipboard = async () => {
    try {
      const copyLink = links.find(l => l.id === 'copylink');
      await navigator.clipboard.writeText(copyLink.url);
      trackShare(copyLink.id);

      $('.ShareBar .ShareBarLinkButton svg')?.replaceWith(Icon('tick'));
      clearTimeout(hdl);
      hdl = setTimeout(() => {
        $('.ShareBar .ShareBarLinkButton svg')?.replaceWith(Icon('link'));
      }, 1500);
    } catch (err) {}
  };

  if (isFuture) {
    return html`
      <div class="ShareBar">
        <div class="ShareBarUrl" onclick="${() => copyToClipboard()}">
          <div class="ShareBarText">${(url || '').replace('https://www.', '').replace(/\d\d\d\d-\d\d-\d\d\//, '')}</div>
          <button class="ShareBarLinkButton">${Icon('link')}</button>
        </div>

        ${ShareButton({ links })}
      </div>
    `;
  }

  //
  // Legacy version
  //
  const formattedType = (type.length ? type : DEFAULT_TYPE).replace(UPPERCASE_PATTERN, x => ' ' + x.toLowerCase());
  const el = html`
    <div class="Share">
      <div class="Share-title">Share this ${formattedType}</div>
      ${ShareLinksLegacy({ links, shouldBlend: true })}
    </div>
  `;

  instances.push(el);

  if (instances.length === 1) {
    subscribe(_checkIfFirstShareInvitationShouldBeReported);
  }

  return el;
};

const ShareButton = ({ links }) => {
  /**
   *
   * @param {PointerEvent} e
   */
  const onClickUrl = e => {
    // Avoid double open
    if (!$('.ShareBar .SharePopover')) {
      // @ts-expect-error
      e.target?.closest('.ShareBannerButton')?.append(popoverEl);
    }
  };

  const onClose = () => {
    $('.ShareBar .SharePopover')?.remove();
  };

  /**
   *
   * @param {PointerEvent} e
   */
  const outsideClick = e => {
    // @ts-expect-error
    if (!$('.SharePopover')?.contains(e.target)) {
      onClose();
    }
  };

  // Create the popover element at the start, so we can add and remove it from the DOM
  let popoverEl = SharePopover({ links, onClose });

  // A click anywhere outside the popover element will close it
  document.addEventListener('pointerup', outsideClick);

  return html`
    <div class="ShareBannerButton">
      <button
        class="ArticleShareButton"
        onclick="${onClickUrl}"
        aria-label="Share this article"
        data-component="Button"
        type="button"
      >
        <span class="ShareButtonTextShort">Share</span>
        <span class="ShareButtonTextLong">Share article</span>
        ${Icon('share')}
      </button>
    </div>
  `;
};

export default Share;

function _checkIfFirstShareInvitationShouldBeReported(client) {
  instances.forEach(el => {
    if (proximityCheck(el.getBoundingClientRect(), client, INVITATION_RANGE)) {
      unsubscribe(_checkIfFirstShareInvitationShouldBeReported);
      track('share-invitation', '*');
    }
  });
}

export const transformMarker = (marker, links) => {
  marker.substituteWith(Share({ type: marker.configString, links }));
};
