// External
const html = require('bel');

// Ours
const {NOEL} = require('../../../constants');
const {detach, isElement, select, trim} = require('../../../utils');

function Caption({
  url,
  text,
  attribution
}) {
  return html`
    <p class="Caption">
      <a href="${url}">${text}</a>
      ${attribution ? html`<span class="Caption-attribution">(${attribution})</span>` : null}
    </p>
  `;
}

function createFromEl(el) {
  if (!isElement(el)) {
    return null;
  }

  const clone = el.cloneNode(true);
  let config;

  if (clone.className.indexOf('photo') > -1) {
    // P1S
    config = {
      url: (select('a', clone) || NOEL).getAttribute('href'),
      attribution: detach(select('.source', clone) || NOEL).textContent.slice(1, -2)
    };
    detach(select('.inline-caption strong', clone));
    config.text = trim((select('.inline-caption', clone) || NOEL).textContent);
  } else if (select('.type-photo', clone)) {
    // P1M
    detach(select('h3 strong', clone));
    config = {
      url: (select('a', clone) || NOEL).getAttribute('href'),
      text: trim((select('h3', clone) || NOEL).textContent),
      attribution: (select('.attribution', clone) || NOEL).textContent
    };
  } else if (select('figcaption', clone)) {
   // P2
   config = {
     url: `/news/${(select('[data-contentidshared]', clone) || NOEL).getAttribute('data-contentidshared')}`,
     text: trim((select('figcaption .lightbox-trigger', clone) || NOEL).textContent),
     attribution: (select('figcaption .byline', clone) || NOEL).textContent.slice(1, -1)
   };
 }

  if (config) {
    return Caption(config);
  }

  return null;
}

module.exports = Caption;
module.exports.createFromEl = createFromEl;
