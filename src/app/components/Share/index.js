// @ts-check
import html from 'nanohtml';
import { $ } from '../../utils/dom';
import { getMeta } from '../../meta';
import SharePopover, { trackShare } from '../SharePopover';
import Icon from '../Icon';
import styles from './index.lazy.scss';

const Share = ({ links }) => {
  if (links.length === 0) {
    return html`<div data-error="No share links to render"></div>`;
  }
  styles.use();

  const { url } = getMeta();

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

  return html`
    <div class="ShareBar">
      <div class="ShareBarUrl" onclick="${() => copyToClipboard()}">
        <div class="ShareBarText">${(url || '').replace('https://www.', '').replace(/\d\d\d\d-\d\d-\d\d\//, '')}</div>
        <button class="ShareBarLinkButton">${Icon('link')}</button>
      </div>

      ${ShareButton({ links })}
    </div>
  `;
};

const ShareButton = ({ links }) => {
  /**
   *
   * @param {PointerEvent} e
   */
  const onClickUrl = e => {
    // Avoid double open
    if (!$('.ShareBar .SharePopover')) {
      // @ts-expect-error Event targets aren't always DOM elements
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

export const transformMarker = (marker, links) => {
  marker.substituteWith(Share({ links }));
};
