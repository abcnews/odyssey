// External
const html = require('bel');

// Ours
const {MOCK_ELEMENT} = require('../../../constants');
const {detach, isElement, select, trim} = require('../../../utils');

function Caption({
  url,
  text,
  attribution
}) {
  if (!text && !attribution) {
    return null;
  }

  return html`
    <p class="Caption" title="${text}${attribution ? ` (${attribution})` : ''}">
      ${url ? html`<a href="${url}">${text}</a>` : text}
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

  if (
    clone.className.indexOf('embedded-external-link') > -1
  ) {
    // P2 (external)
    config = {
      url: (select('.embed-caption a', clone) || MOCK_ELEMENT).getAttribute('href'),
      text: [
        trim((select('.embed-label', clone) || MOCK_ELEMENT).textContent),
        trim((select('.embed-caption a span', clone) || MOCK_ELEMENT).textContent),
        trim((select('.inline-caption span', clone) || MOCK_ELEMENT).textContent)
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
      url: (select('a', clone) || MOCK_ELEMENT).getAttribute('href'),
      attribution: trim(detach(select('.source', clone) || MOCK_ELEMENT).textContent.slice(1, -1))
    };
    if (clone.className.indexOf(' embedded') === -1) {
      detach(select('.inline-caption strong', clone));
    }
    config.text = trim((select('.inline-caption', clone) || MOCK_ELEMENT).textContent);
  } else if (
    select('.type-photo, .type-video, .type-external', clone)
  ) {
    // P1M
    if (!select('.type-external', clone)) {
      detach(select('h3 strong', clone));
    }
    config = {
      url: (select('a', clone) || MOCK_ELEMENT).getAttribute('href'),
      text: trim((select('h3', clone) || MOCK_ELEMENT).textContent),
      attribution: trim((select('.attribution', clone) || MOCK_ELEMENT).textContent)
    };
  } else if (
    select('figcaption', clone)
  ) {
    // P2 (image)
    config = {
      url: `/news/${(select('[data-contentidshared]', clone) || MOCK_ELEMENT).getAttribute('data-contentidshared')}`,
      text: trim((select('figcaption .lightbox-trigger', clone) || MOCK_ELEMENT).textContent),
      attribution: trim((select('figcaption .byline', clone) || MOCK_ELEMENT).textContent.slice(1, -1))
    };
  } else if (
    select('.comp-video-player', clone)
  ) {
    // P2 (video)
    config = {
      url: (select('.comp-video-player ~ .caption a', clone) || MOCK_ELEMENT).getAttribute('href'),
      text: trim((select('.comp-video-player ~ .caption a', clone) || MOCK_ELEMENT).textContent),
      attribution: trim((select('.comp-video-player ~ .caption .byline', clone) || MOCK_ELEMENT).textContent.slice(1, -1))
    };
  }

  if (config) {
    return Caption(Object.assign(config));
  }

  return null;
}

module.exports = Caption;
module.exports.createFromEl = createFromEl;
