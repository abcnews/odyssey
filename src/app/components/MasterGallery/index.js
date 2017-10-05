// External
const html = require('bel');
const screenfull = require('screenfull');
const url2cmid = require('util-url2cmid');

// Ours
const { enqueue, invalidateClient } = require('../../scheduler');
const { $, $$, prepend } = require('../../utils/dom');
const Caption = require('../Caption');
const Gallery = require('../Gallery');
const Picture = require('../Picture');
require('./index.scss');

const TAB_KEY = 9;

const registeredImageIds = {};
const images = [];
let masterGalleryEl = null; // singleton

function MasterGallery() {
  if (masterGalleryEl) {
    return masterGalleryEl;
  }

  if (images.length === 0) {
    return html`<div class="MasterGallery is-empty"></div>`;
  }

  const galleryEl = Gallery({ images });

  galleryEl.classList.remove('u-full');

  function goToId(id) {
    const imageEl = $(`[data-id="${id}"]`, galleryEl);
    const index = imageEl.dataset['index'];

    if (index != null) {
      galleryEl.api.goToImage(+index, true);
      open(galleryEl);
    }
  }

  window.addEventListener('click', event => {
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

    goToId(id);
  });

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
    <button class="MasterGallery-close"
      aria-label="Close the gallery"
      onkeydown=${event => {
        if (event.shiftKey && event.keyCode === TAB_KEY) {
          event.preventDefault();

          if (lastCaptionLinkEl) {
            lastCaptionLinkEl.focus();
          }
        }
      }}
      onclick=${close}></button>
  `;

  prepend($('.Gallery-layout', galleryEl), closeEl);

  masterGalleryEl = html`
    <div
      class="MasterGallery"
      role="dialog"
      aria-label="Gallery of all photos in this story"
      tabindex="-1"
      onclick=${function(event) {
        if (this === event.target) {
          close();
        }
      }}>
      <div class="MasterGallery-container u-richtext-invert">
        ${galleryEl}
      </div>
    </div>
  `;

  return masterGalleryEl;
}

let lastKnownScrollY;
let externalActiveElement;

function open(el) {
  lastKnownScrollY = window.scrollY;
  document.documentElement.classList.add('is-master-gallery-open');
  externalActiveElement = document.activeElement;
  enqueue(() => {
    $('.is-active', masterGalleryEl).focus();
  });
  invalidateClient();

  if (screenfull.enabled) {
    screenfull.request();
  }
}

function close() {
  document.documentElement.classList.remove('is-master-gallery-open');

  if (externalActiveElement) {
    externalActiveElement.focus();
  }

  if (screenfull.isFullscreen) {
    screenfull.exit();
  }
}

if (screenfull) {
  screenfull.onchange(() => {
    if (screenfull.isFullscreen) {
      window.scrollTo(0, lastKnownScrollY);
      // ...because window scrolls to y=0 while fullscreen is active
      setTimeout(invalidateClient, 1000);
    } else {
      close();
    }
  });
}

function has(id) {
  return images.filter(image => image.id === id).length > 0;
}

function register(el) {
  const imgEl = $('img', el);

  if (!imgEl) {
    return;
  }

  const src = imgEl.src;
  const id = url2cmid(src);

  if (!id || registeredImageIds[id]) {
    return;
  }

  registeredImageIds[id] = true;

  images.push({
    id,
    pictureEl: Picture({
      src: src,
      alt: imgEl.getAttribute('alt'),
      ratios: {
        sm: '1x1',
        md: '4x3'
      }
    }),
    captionEl: Caption.createFromEl(el)
  });
}

module.exports = MasterGallery;
module.exports.register = register;
