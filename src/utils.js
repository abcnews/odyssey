const {HYPHEN, NEWLINE} = require('./constants');

const TRIM_PATTERN = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
const SLUG_ALLOWED_PATTERN = /[^\w\s\-\.\_~]/g;
const SLUG_REPLACE_PATTERN = /[-\s]+/g;
const INLINE_TAG_NAMES = [
    'b', 'big', 'br', 'i', 'small', 'tt', 'abbr', 'acronym', 'cite',
    'code', 'dfn', 'em', 'kbd', 'strong', 'samp', 'time', 'var',
    'a', 'bdo','img', 'map', 'object', 'q', 'script', 'span',
    'sub', 'sup', 'button', 'input', 'label', 'select', 'textarea'
];

function returnFalse() {
  return false;
}

function trim(str) {
  return str.replace(TRIM_PATTERN, '');
}

function slug(str) {
  return str.toLowerCase()
  .replace(SLUG_ALLOWED_PATTERN, '')
  .replace(SLUG_REPLACE_PATTERN, HYPHEN);
}

function twoDigits(number) {
	return `${number < 10 ? '0' : ''}${number}`;
}

function slice(arrayLike) {
  return Array.prototype.slice.call(arrayLike);
}

function flatten(lists) {
  return lists.reduce((acc, list) => {
    return acc.concat(list);
  }, []);
}

function literalList(str, {skipTrim, allowEmpty} = {}) {
  return str.split(NEWLINE)
  .map(x => skipTrim? x : x.trim())
  .filter(x => allowEmpty ? x : x.length).join();
}

function isText(node) {
  return node && node.nodeType === Node.TEXT_NODE;
}

function isElement(node) {
  return node && node.nodeType === Node.ELEMENT_NODE;
}

function isInlineElement(node) {
  return isElement(node) &&
    INLINE_TAG_NAMES.indexOf(node.tagName.toLowerCase()) > -1;
}

function isDocument(node) {
  return node && node.nodeType === Node.DOCUMENT_NODE;
}

function create(tagName) {
  return document.createElement(tagName);
}

function select(selector, root) {
  root = isElement(root) ? root : document;

  return root.querySelector(selector);
}

function selectAll(selector, roots) {
  roots = Array.isArray(roots) ? roots : [roots];
  roots = isElement(roots[0]) ? roots : [document];

  return roots.reduce((acc, root) => {
    if ('querySelectorAll' in root) {
      const results = root.querySelectorAll(selector);

      return acc.concat([...results]);
    }

    return acc;
  }, []);
}

function detach(node = {}) {
  if (node != null && node.parentNode) {
    node.parentNode.removeChild(node);
  }

  return node;
}

function detachAll(nodes) {
  return nodes.map(detach);
}

function append(parent, node) {
  parent.appendChild(node);
}

function prepend(parent, node) {
  before(parent.firstChild, node);
}

function before(sibling, node) {
  sibling.parentElement.insertBefore(node, sibling);
}

function after(sibling, node) {
  sibling.parentElement.insertBefore(node, sibling.nextSibling);
}

function toggleAttribute(node, attribute, shouldBeApplied) {
  node[`${shouldBeApplied ? 'set' : 'remove'}Attribute`](attribute, '');
}

function _replaceSectionWith(el) {
  before(this.startNode, el);

  return detachAll(this.betweenNodes.concat([this.startNode, this.endNode]));
}

function getSections(names) {
  if (typeof names === 'string') {
    names = [names];
  }

  const sections = [];

  names.forEach(name => {
    const endName = `end${name}`;

    selectAll(`a[name^="${name}"]`).forEach(startNode => {
      let nextNode = startNode;
    	let isMoreContent = true;
    	const betweenNodes = [];
      const suffix = startNode.getAttribute('name').slice(name.length);

    	while(isMoreContent && (nextNode = nextNode.nextSibling) !== null) {
    		if (isElement(nextNode) && (nextNode.getAttribute('name') || '').indexOf(endName) === 0) {
    			isMoreContent = false;
    		} else {
    			betweenNodes.push(nextNode);
    		}
    	}

      const section = {
        name,
        suffix,
    		startNode,
        betweenNodes,
        endNode: nextNode
    	};

      section.replaceWith = _replaceSectionWith.bind(section);
    	sections.push(section);
    });
  });

  return sections;
}

function _replacePlaceholderWith(el) {
  before(this.node, el);

  return detach(this.node);
}

function getPlaceholders(names) {
  if (typeof names === 'string') {
    names = [names];
  }

  const placeholders = [];

  names.forEach(name => {
    selectAll(`a[name^="${name}"]`).forEach(node => {
      const suffix = node.getAttribute('name').slice(name.length);

      const placeholder = {
        name,
        suffix,
    		node
    	};

      placeholder.replaceWith = _replacePlaceholderWith.bind(placeholder);
    	placeholders.push(placeholder);
    });
  });

  return placeholders;
}

function _linebreaksToParagraphsAppender(state) {
  if (!state.stack.length) {
    return state;
  }

  const pEl = create('p');

  while (state.stack.length) {
    append(pEl, state.stack.shift());
  }

  append(state.cEl, pEl);

  return state;
}

function _linebreaksToParagraphsReducer(state, node, index, nodes) {
  // On the first iteration, initialise the state
  if (index === 0) {
    state.cEl = create('div');
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
  const cEl = slice(el.childNodes)
  .reduce(_linebreaksToParagraphsReducer, {});

  slice(cEl.childNodes)
  .forEach(childEl => append(el, childEl));

  return el;
}

module.exports = {
  returnFalse,
  trim,
  slug,
  twoDigits,
  slice,
  flatten,
  literalList,
  isText,
  isElement,
  isDocument,
  select,
  selectAll,
  detach,
  detachAll,
  append,
  prepend,
  before,
  after,
  toggleAttribute,
  getSections,
  getPlaceholders,
  linebreaksToParagraphs
};
