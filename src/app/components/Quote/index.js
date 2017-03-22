// External
const html = require('bel');

// Ours
const {NOEL} = require('../../../constants');
const {append, detach, isElement, isText, linebreaksToParagraphs, prepend, select, selectAll, slice, trim} = require('../../../utils');

function Quote({
  isPullquote = false,
  parEls = [],
  attributionNodes = []
}) {
  const className = `Quote${isPullquote ? ' is-pullquote' : ''}`;
  const attributionEl = attributionNodes.length ? html`
    <footer>${slice(attributionNodes).map(node => {
      return isText(node) ? trim(node.textContent) : node;
    })}</footer>
  ` : null;

  if (isPullquote && parEls.length) {
    prepend(parEls[0], html`<span class="Quote-opener"></span>`);
    append(parEls[parEls.length - 1], html`<span class="Quote-closer"></span>`);
  }

  return html`
    <div class="${className}">
      <blockquote>
        ${parEls.concat(attributionEl)}
      </blockquote>
    </div>
  `;
}

function createFromEl(el) {
  if (!isElement(el)) {
    return null;
  }

  const clone = el.cloneNode(true);
  let config;

  if (clone.tagName === 'BLOCKQUOTE') {
    // P1S-B, P1M-B, P2-B, P1S-P, P1M-P
    if (clone.className.indexOf('source-blockquote') > -1) {
      // P2-B
      config = {
        parEls: selectAll('p', clone),
        attributionNodes: (select('footer', clone) || NOEL.cloneNode()).childNodes
      };
    } else {
      // P1S-B, P1M-B, P1S-P, P1M-P
      config = {
        isPullquote: clone.className.indexOf('quote--pullquote') > -1,
        parEls: selectAll('p:not([class])', clone),
        attributionNodes: (select('.p--pullquote-byline', clone) || NOEL.cloneNode()).childNodes
      };
    }
  } else if (clone.tagName === 'ASIDE') {
    // P2-P
    config = {
      isPullquote: true,
      parEls: selectAll('p', clone),
      attributionNodes: (select('footer', clone) || NOEL.cloneNode()).childNodes
    };
  } else if (clone.tagName === 'FIGURE') {
    // P1M-E
    config = {
      isPullquote: true,
      parEls: slice(linebreaksToParagraphs(select('blockquote', clone) || NOEL.cloneNode()).childNodes),
      attributionNodes: (select('figcaption', clone) || NOEL.cloneNode()).childNodes
    };
  } else if (clone.className.indexOf('inline-content quote') > -1 ||
      clone.className.indexOf('view-inline-pullquote') > -1) {
    // P1S-E, P2-E
    config = {
      isPullquote: true,
      parEls: selectAll('p', clone),
      attributionNodes: (select('.cite', clone) || NOEL.cloneNode()).childNodes
    };
  }

  if (config) {
    return Quote(config);
  }

  // return null;
  return clone; // TODO: restore above line
}

module.exports = Quote;
module.exports.createFromEl = createFromEl;
