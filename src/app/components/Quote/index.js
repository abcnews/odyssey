// External
const cn = require('classnames');
const html = require('bel');

// Ours
const {ALIGNMENT_PATTERN, MOCK_NODE} = require('../../../constants');
const {append, detach, getDescendantTextNodes, grabConfigSC, isElement, isText,
  linebreaksToParagraphs, prepend, $, $$, substitute, trim} = require('../../../utils');

const DOUBLE_QUOTE_PATTERN = /\"/g; 
const OPENING_DOUBLE_QUOTE = '“';
const CLOSING_DOUBLE_QUOTE = '”';
const HAIR_SPACE = ' ';

function Quote({
  isPullquote = false,
  alignment,
  parEls = [],
  attributionNodes = []
}) {
  const className = cn('Quote', {
    'is-pullquote': isPullquote,
    [`u-pull-${alignment}`]: alignment
  });
  const attributionEl = attributionNodes.length ? html`
    <footer>${Array.from(attributionNodes).map(node => {
      return node.tagName === 'A' ? html`<cite>${node}</cite>` : node;
    })}</footer>
  ` : null;


  // Smart double quotes
  if (parEls.length) {
    parEls.forEach(parEl => {
      let toggle = false;
      let hasDoubleQuotes = false;

      getDescendantTextNodes(parEl)
      .forEach(node => {
        if (DOUBLE_QUOTE_PATTERN.test(node.nodeValue)) {
          node.nodeValue = node.nodeValue.replace(DOUBLE_QUOTE_PATTERN, () => {
            hasDoubleQuotes = true;

            return (toggle = !toggle) ?
              OPENING_DOUBLE_QUOTE + HAIR_SPACE :
              HAIR_SPACE + CLOSING_DOUBLE_QUOTE;
          });
        }
      });

      if (hasDoubleQuotes) {
        parEl.classList.add('has-double-quotes');
      }
    });
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
        parEls: $$('p', clone),
        attributionNodes: ($('footer', clone) || MOCK_NODE).childNodes
      };
    } else {
      // P1S-B, P1M-B, P1S-P, P1M-P
      config = {
        isPullquote: clone.className.indexOf('quote--pullquote') > -1,
        parEls: $$('p:not([class])', clone),
        attributionNodes: ($('.p--pullquote-byline', clone) || MOCK_NODE).childNodes
      };
    }
  } else if (clone.tagName === 'ASIDE') {
    // P2-P
    config = {
      isPullquote: true,
      parEls: $$('p', clone),
      attributionNodes: ($('footer', clone) || MOCK_NODE).childNodes
    };
  } else if (clone.tagName === 'FIGURE') {
    // P1M-E
    config = {
      isPullquote: true,
      parEls: Array.from(linebreaksToParagraphs($('blockquote', clone) || MOCK_NODE).childNodes),
      attributionNodes: ($('figcaption', clone) || MOCK_NODE).childNodes
    };
  } else if (clone.className.indexOf('inline-content quote') > -1 ||
      clone.className.indexOf('view-inline-pullquote') > -1) {
    // P1S-E, P2-E
    config = {
      isPullquote: true,
      parEls: $$('p', clone),
      attributionNodes: ($('.cite', clone) || MOCK_NODE).childNodes
    };
  }

  const configSC = grabConfigSC(el);
  const [, alignment] = configSC.match(ALIGNMENT_PATTERN) || [];

  config.alignment = alignment;

  // Split paragraphs on <br>s
  config.parEls = config.parEls.reduce((memo, parEl) => {
    const stack = [];
    let nextNode;

    function addStackAsPar() {
      if (stack.length === 0) {
        return;
      }

      const parEl =  html`<p></p>`;

      while (stack.length > 0) {
        prepend(stack.pop(), parEl)
      }

      memo.push(parEl);
    }

    if ($('br', parEl)) {
      while (parEl.firstChild !== null) {
        nextNode = detach(parEl.childNodes[0]);

        if (isBr(nextNode)) {
          addStackAsPar();
        } else {
          stack.push(nextNode);
        }
      }

      addStackAsPar();
    } else {
      memo.push(parEl);
    }

    return memo;
  }, []);

  if (config) {
    return Quote(config);
  }

  return null;
}

function transformEl(el) {
  substitute(el, createFromEl(el));
}

function isBr(node) {
  return isElement(node) && node.tagName === 'BR';
}

module.exports = Quote;
module.exports.createFromEl = createFromEl;
module.exports.transformEl = transformEl;
