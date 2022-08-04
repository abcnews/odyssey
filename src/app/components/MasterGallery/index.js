import { url2cmid } from '@abcnews/url2cmid';
import html from 'nanohtml';
import { enqueue, invalidateClient } from '../../scheduler';
import { track } from '../../utils/behaviour';
import { $, $$, prepend } from '../../utils/dom';
import { createFromTerminusDoc as createCaptionFromTerminusDoc } from '../Caption';
import Gallery from '../Gallery';
import Picture from '../Picture';
import './index.scss';

const TAB_KEY = 9;

const items = [];
let masterGalleryEl = null; // singleton
let clickHandler = null;

const MasterGallery = () => {
  if (masterGalleryEl) {
    return masterGalleryEl;
  }

  if (items.length === 0) {
    masterGalleryEl = html`<div class="MasterGallery is-empty"></div>`;

    return masterGalleryEl;
  }

  const galleryEl = Gallery({ items });

  galleryEl.classList.remove('u-full');

  function goToId(id) {
    const itemEl = $(`[data-id="${id}"]`, galleryEl);
    const index = itemEl.dataset['index'];

    if (index != null) {
      open(galleryEl, +index);
    }
  }

  if (clickHandler) {
    window.removeEventListener('click', clickHandler);
  }

  clickHandler = event => {
    if ((event.button && event.button !== 0) || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
      return;
    }

    let node = (function traverse(node) {
      if (!node || node === window.document) {
        return;
      }

      if (node.localName !== 'a' || node.href === undefined || window.location.host !== node.host) {
        return traverse(node.parentNode);
      }

      return node;
    })(event.target);

    if (!node || galleryEl.contains(node)) {
      return;
    }

    const id = url2cmid(node.href);

    if (!has(id)) {
      return;
    }

    event.preventDefault();

    track('master-gallery-open', id);
    goToId(id);
  };

  window.addEventListener('click', clickHandler);

  const captionLinkEls = $$('.Caption a', galleryEl);
  const lastCaptionLinkEl = captionLinkEls[captionLinkEls.length - 1];

  if (lastCaptionLinkEl) {
    lastCaptionLinkEl.onkeydown = event => {
      if (!event.shiftKey && event.keyCode === TAB_KEY) {
        event.preventDefault();
        closeEl.focus();
      }
    };
  }

  const closeEl = html`
    <button
      class="MasterGallery-close"
      aria-label="Close the gallery"
      onkeydown="${event => {
        if (event.shiftKey && event.keyCode === TAB_KEY) {
          event.preventDefault();

          if (lastCaptionLinkEl) {
            lastCaptionLinkEl.focus();
          }
        }
      }}"
      onclick="${close}"
    ></button>
  `;

  prepend($('.Gallery-layout', galleryEl), closeEl);

  masterGalleryEl = html`
    <div
      class="MasterGallery"
      role="dialog"
      aria-label="Gallery of all photos in this story"
      tabindex="-1"
      onclick="${function (event) {
        if (this === event.target) {
          close();
        }
      }}"
    >
      <div class="MasterGallery-container u-richtext-invert">${galleryEl}</div>
    </div>
  `;

  return masterGalleryEl;
};

export default MasterGallery;

let externalActiveElement;

function open(galleryEl, index = 0) {
  galleryEl.api.goToItem(index, true);
  document.documentElement.classList.add('is-master-gallery-open');
  externalActiveElement = document.activeElement;
  enqueue(function _focusActiveMasterGalleryItem() {
    $('.is-active', masterGalleryEl).focus();
  });
  invalidateClient();
  setTimeout(galleryEl.api.measureDimensions, 0);
}

function close() {
  document.documentElement.classList.remove('is-master-gallery-open');

  if (externalActiveElement) {
    externalActiveElement.focus();
  }
}

function has(id) {
  return items.filter(item => item.id === id).length > 0;
}

export const register = image => {
  const { id, media } = image;
  const { complete, images } = media.image.primary;

  if (Object.keys(images).length < 2) {
    // Custom images only have one (non-standard crop)
    return;
  }

  items.push({
    id,
    mediaEl: Picture({
      src: complete[0].url,
      alt: image.alt,
      ratios: {
        sm: '1x1',
        md: '4x3'
      }
    }),
    captionEl: createCaptionFromTerminusDoc(image)
  });
};
