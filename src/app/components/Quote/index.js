// External
const cn = require('classnames');
const html = require('bel');

// Ours
const { ALIGNMENT_PATTERN, MOCK_NODE } = require('../../../constants');
const { grabConfigSC } = require('../../utils/anchors');
const { $, $$, append, detach, isElement, isInlineElement, isText, prepend, substitute } = require('../../utils/dom');
const { trim } = require('../../utils/misc');
const UQuote = require('../UQuote');
require('./index.scss');

function Quote({ isPullquote = false, alignment, parEls = [], attributionNodes = [] }) {
  const className = cn('Quote', {
    'is-pullquote': isPullquote,
    [`u-pull-${alignment}`]: alignment
  });
  const attributionEl = attributionNodes.length
    ? html`
        <footer>
          ${Array.from(attributionNodes).map(node => {
            return node.tagName === 'A'
              ? html`
                  <cite>${node}</cite>
                `
              : node;
          })}
        </footer>
      `
    : null;

  // Smart double quotes & indentation
  if (parEls.length) {
    parEls.forEach(parEl => UQuote.conditionallyApply(parEl, isPullquote));
  }

  return html`
    <div class="${className}">
      <blockquote>${parEls.concat(attributionEl)}</blockquote>
    </div>
  `;
}

function createFromEl(el, options) {
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
  } else if (
    clone.className.indexOf('inline-content quote') > -1 ||
    clone.className.indexOf('view-inline-pullquote') > -1
  ) {
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

      const parEl = html`
        <p></p>
      `;

      while (stack.length > 0) {
        prepend(parEl, stack.pop());
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
    return Quote({ ...config, ...(typeof options === 'object' ? options : {}) });
  }

  return null;
}

function transformEl(el, options) {
  substitute(el, createFromEl(el, options));
}

function isBr(node) {
  return isElement(node) && node.tagName === 'BR';
}

function _linebreaksToParagraphsAppender(state) {
  if (!state.stack.length) {
    return state;
  }

  const pEl = document.createElement('p');

  while (state.stack.length) {
    append(pEl, state.stack.shift());
  }

  append(state.cEl, pEl);

  return state;
}

function _linebreaksToParagraphsReducer(state, node, index, nodes) {
  // On the first iteration, initialise the state
  if (index === 0) {
    state.cEl = document.createElement('div');
    state.stack = [];
  }

  // Decide to do with each node, depending on
  // its type and tagName. The aim of this reducer
  // is to wrap series' of loose text/inline elements in
  // <p> elements and discard <br> elements

  if (isText(node)) {
    // Push the text element onto the stack if it
    // contains more than empty space
    if (trim(node.nodeValue).length) {
      state.stack.push(node);
    }
  } else if (isInlineElement(node)) {
    if (node.tagName === 'BR') {
      // Append the stack, discarding the <br> element
      state = _linebreaksToParagraphsAppender(state);
      detach(node);
    } else {
      // Push the inline element onto the stack
      state.stack.push(node);
    }
  } else {
    // Append the stack, then append the node
    // (which should be a non-text, non-inline element)
    state = _linebreaksToParagraphsAppender(state);
    append(state.cEl, node);
  }

  // If continuing to iterate, return the state
  if (nodes.length - 1 > index) {
    return state;
  }

  // On the last iteration, append the stack (which may not
  // be empty), then return the state's container
  return _linebreaksToParagraphsAppender(state).cEl;
}

function linebreaksToParagraphs(el) {
  const cEl = Array.from(el.childNodes).reduce(_linebreaksToParagraphsReducer, {});

  Array.from(cEl.childNodes).forEach(childEl => append(el, childEl));

  return el;
}

module.exports = Quote;
module.exports.createFromEl = createFromEl;
module.exports.transformEl = transformEl;
