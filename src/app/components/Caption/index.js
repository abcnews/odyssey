// External
const html = require('bel');

// Ours
const { MOCK_ELEMENT } = require('../../../constants');
const { $, detach, isElement } = require('../../utils/dom');
const { trim } = require('../../utils/misc');
require('./index.scss');

function Caption({ url, text, attribution }) {
  if (!text && !attribution) {
    return null;
  }

  return html`
    <p class="Caption" title="${text}${attribution ? ` (${attribution})` : ''}">
      ${url ? html`<a href="${url}">${text}</a>` : html`<span>${text}</span>`}
      ${attribution ? html`<em class="Caption-attribution">${attribution}</em>` : null}
    </p>
  `;
}

function createFromEl(el) {
  if (!isElement(el)) {
    return null;
  }

  const clone = el.cloneNode(true);
  let config;

  if (clone.className.indexOf('embedded-external-link') > -1) {
    // P2 (external)
    config = {
      url: ($('.embed-caption a', clone) || MOCK_ELEMENT).getAttribute('href'),
      text: [
        trim(($('.embed-label', clone) || MOCK_ELEMENT).textContent),
        trim(($('.embed-caption a span', clone) || MOCK_ELEMENT).textContent),
        trim(($('.inline-caption span', clone) || MOCK_ELEMENT).textContent)
      ].join(' '),
      attribution: ''
    };
  } else if (
    clone.className.indexOf(' photo') > -1 ||
    clone.className.indexOf(' video') > -1 ||
    clone.className.indexOf(' embedded') > -1
  ) {
    // P1S
    config = {
      url: ($('a', clone) || MOCK_ELEMENT).getAttribute('href'),
      attribution: trim(detach($('.source', clone) || MOCK_ELEMENT).textContent.slice(1, -1))
    };
    if (clone.className.indexOf(' embedded') === -1) {
      detach($('.inline-caption strong', clone));
    }
    config.text = trim(($('.inline-caption', clone) || MOCK_ELEMENT).textContent);
  } else if ($('.type-photo, .type-video, .type-external', clone)) {
    // P1M
    if (!$('.type-external', clone) || clone.textContent.indexOf(':') > -1) {
      detach($('h3 strong', clone));
    }
    config = {
      url: ($('a', clone) || MOCK_ELEMENT).getAttribute('href'),
      text: trim(($('h3', clone) || MOCK_ELEMENT).textContent),
      attribution: trim(($('.attribution', clone) || MOCK_ELEMENT).textContent)
    };
  } else if ($('figcaption', clone)) {
    // P2 (image)
    config = {
      url: `/news/${($('[data-contentidshared]', clone) || MOCK_ELEMENT).getAttribute('data-contentidshared')}`,
      text: trim(($('figcaption .lightbox-trigger', clone) || MOCK_ELEMENT).textContent),
      attribution: trim(($('figcaption .byline', clone) || MOCK_ELEMENT).textContent.slice(1, -1))
    };
  } else if ($('.comp-video-player', clone)) {
    // P2 (video)
    config = {
      url: ($('.comp-video-player ~ .caption a', clone) || MOCK_ELEMENT).getAttribute('href'),
      text: trim(($('.comp-video-player ~ .caption a', clone) || MOCK_ELEMENT).textContent),
      attribution: trim(($('.comp-video-player ~ .caption .byline', clone) || MOCK_ELEMENT).textContent.slice(1, -1))
    };
  }

  if (config) {
    return Caption(Object.assign(config));
  }

  return null;
}

module.exports = Caption;
module.exports.createFromEl = createFromEl;
