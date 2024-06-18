import html from 'nanohtml';
import { track } from '../../utils/behaviour';
import { proximityCheck } from '../../utils/misc';
import { $ } from '../../utils/dom';
import { getMeta } from '../../meta';
import { subscribe, unsubscribe } from '../../scheduler';
import ShareLinksLegacy from '../legacy/ShareLinks';
import SharePopover from '../SharePopover';
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
  const onClickUrl = async (url) => {
    // TODO: Tracking

     try {
      await navigator.clipboard.writeText(`${url}?utm_campaign=abc_news_web&utm_content=link&utm_medium=content_shared&utm_source=abc_news_web`);

      $('.ShareBar .ShareBarLinkButton').replaceWith(TickButton());
      clearTimeout(hdl);
      hdl = setTimeout(() => {
        $('.ShareBar .ShareBarLinkButton').replaceWith(LinkButton());
      }, 1500);
    } catch (err) {
    }
  };

  if (isFuture) {
    return html`
      <div class="ShareBar">
        <div class="ShareBarUrl" onclick="${() => onClickUrl(url)}">
          <div class="ShareBarText">
            ${url.replace('https://www.', '').replace(/\d\d\d\d-\d\d-\d\d\//, '')}
          </div>
          ${LinkButton()}
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

const LinkButton = () => {
  return html`
    <button class="ShareBarLinkButton">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="1em" height="1em" class="ShareBarLinkBtnIcon" aria-hidden="true">

        <path stroke="currentColor" stroke-width="2" d="M11.119 14.069s-.48-.33-.694-.544c-1.367-1.367-1.404-3.546-.082-4.868l2.992-2.992c1.321-1.321 3.5-1.285 4.868.082 1.367 1.367 1.403 3.546.081 4.868l-1.555 1.556" />
        <path stroke="currentColor" stroke-width="2" d="M12.559 10.153c.247.149.48.33.694.544 1.367 1.367 1.403 3.546.082 4.868l-2.992 2.992c-1.322 1.321-3.501 1.285-4.868-.082-1.367-1.367-1.404-3.547-.082-4.868L6.95 12.05" />

      </svg>
    </button>
  `;
}

const TickButton = () => {
  return html`
    <button class="ShareBarLinkButton">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="1em" height="1em" class="ShareBarLinkBtnIcon" aria-hidden="true">
        <path stroke="currentColor" stroke-width="2" d="M20 6 8 18l-5-5" />
      </svg>
    </button>
  `;
}

const ShareButton = ({ links }) => {

  const onClickUrl = (url) => {
    // TODO: Tracking

    // Avoid double open
    if (!$('.ShareBar .SharePopover')) {
      $('.ShareBar .ShareBannerButton').append(popoverEl);
    }
  };

  const onClose = () => {
    $('.ShareBar .SharePopover')?.remove();
  }

  let popoverEl = SharePopover({ links, onClose });

  document.addEventListener('mouseup', function(e) {
    if (!$('.SharePopover')?.contains(e.target)) {
      onClose();
    }
  });

  return html`
    <div class="ShareBannerButton">
      <button class="ArticleShareButton" onclick="${() => onClickUrl()}" aria-label="Share this article" data-component="Button" type="button">
      <span class="ShareButtonTextShort">Share</span>
      <span class="ShareButtonTextLong">Share article</span>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="1em" height="1em" data-component="ShareWeb" class="">
        <path fill="currentColor" fill-rule="evenodd" d="M15 13s-9-1-12.998 7c0 0 0-13 12.998-13V3l7 7-7 7v-4Z" clip-rule="evenodd" />
      </svg>
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
