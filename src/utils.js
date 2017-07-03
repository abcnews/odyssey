const {HYPHEN, MOCK_ELEMENT, NEWLINE} = require('./constants');

const TRIM_PATTERN = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;
const SLUG_ALLOWED_PATTERN = /[^\w\s\-\_]/g;
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

function $(selector, root) {
  root = isElement(root) ? root : document;

  return root.querySelector(selector);
}

function $$(selector, roots) {
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

function getDescendantTextNodes(el) {
  return Array.from(el.childNodes).reduce((memo, node) => {
    if (isText(node)) {
      memo.push(node);
    } else if (isElement(node)) {
      memo = memo.concat(getDescendantTextNodes(node));
    }

    return memo;
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
  parent.insertBefore(node, parent.firstChild);
}

function before(sibling, node) {
  sibling.parentNode.insertBefore(node, sibling);
}

function after(sibling, node) {
  sibling.parentNode.insertBefore(node, sibling.nextSibling);
}

function substitute(node, replacementNode) {
  before(node, replacementNode);

  return detach(node);
}

function setText(el, text) {
  let node = el.firstChild;

  if (node === null || !isText(node)) {
    prepend(el, node = document.createTextNode(text));
  } else {
    node.nodeValue = text;
  }
}

function toggleAttribute(node, attribute, shouldBeApplied) {
  node[`${shouldBeApplied ? 'set' : 'remove'}Attribute`](attribute, '');
}

function _substituteSectionWith(el, remainingBetweenNodes) {
  remainingBetweenNodes = Array.isArray(remainingBetweenNodes) ?
    remainingBetweenNodes : this.betweenNodes;

  detachAll(remainingBetweenNodes.concat([this.endNode]));

  return substitute(this.startNode, el);
}

function getSections(names) {
  if (typeof names === 'string') {
    names = [names];
  }

  const sections = [];

  names.forEach(name => {
    const endName = `end${name}`;

    $$(`a[name^="${name}"]`).forEach(startNode => {
      let nextNode = startNode;
    	let isMoreContent = true;
    	const betweenNodes = [];
      const configSC = startNode.getAttribute('name').slice(name.length);

    	while(isMoreContent && (nextNode = nextNode.nextSibling) !== null) {
    		if (isElement(nextNode) && (nextNode.getAttribute('name') || '').indexOf(endName) === 0) {
    			isMoreContent = false;
    		} else {
    			betweenNodes.push(nextNode);
    		}
    	}

      const section = {
        name,
        configSC,
    		startNode,
        betweenNodes,
        endNode: nextNode
    	};

      section.substituteWith = _substituteSectionWith.bind(section);
    	sections.push(section);
    });
  });

  return sections;
}

function getMarkers(names) {
  if (typeof names === 'string') {
    names = [names];
  }

  return names.reduce((memo, name) => {
    return memo.concat($$(`a[name^="${name}"]`).map(node => {
      const configSC = node.getAttribute('name').slice(name.length);

      const marker = {
        name,
        configSC,
    		node
    	};

      marker.substituteWith = substitute.bind(null, marker.node);
    	
      return marker;
    }));
  }, []);
}

function grabConfigSC(el) {
  const prevEl = el.previousElementSibling || MOCK_ELEMENT;
  const prevElName = prevEl.getAttribute('name') || '';
  let configSC;

  // TODO: Convert #image and #video in all stories to #config
  ['config', 'image', 'video']
  .some(name => {
    if (prevElName.indexOf(name) === 0) {
      configSC = prevElName.slice(name.length);
      detach(prevEl);
    }
  });

  return configSC || '';
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
  const cEl = Array.from(el.childNodes)
  .reduce(_linebreaksToParagraphsReducer, {});

  Array.from(cEl.childNodes)
  .forEach(childEl => append(el, childEl));

  return el;
}

function dePx(px) {
  return +px.replace('px', '');
}

function proximityCheck(rect, client, range = 0) {
  // `rect` is #getBoundingClientRect of element
  // `client` is visible width & height dimensions
  // `range` is amount extend (or reduce) the perimeter as a multiple of each dimension

  return (
    // Has size
    rect.width > 0 &&
    rect.height > 0 &&
    (
      // Fully covering client on Y-axis
      (rect.top <= 0 && rect.bottom >= client.height) ||
      // Top within load range
      (rect.top >= 0 && rect.top <= client.height * (1 + range)) ||
      // Bottom within load range
      (rect.bottom >= client.height * -range && rect.bottom <= client.height)
    ) &&
    (
      // Fully covering client on X-axis
      (rect.left <= 0 && rect.right >= client.width) ||
      // Left within load range
      (rect.left >= 0 && rect.left <= client.width * (1 + range)) ||
      // Right within load range
      (rect.right >= client.width * -range && rect.right <= client.width)
    )
  );
}

module.exports = {
  returnFalse,
  trim,
  slug,
  twoDigits,
  flatten,
  literalList,
  isText,
  isElement,
  isDocument,
  $,
  $$,
  getDescendantTextNodes,
  detach,
  detachAll,
  append,
  prepend,
  before,
  after,
  substitute,
  setText,
  toggleAttribute,
  getSections,
  getMarkers,
  grabConfigSC,
  linebreaksToParagraphs,
  dePx,
  proximityCheck,
  // Deprecated API
  select: $,
  selectAll: $$
};
