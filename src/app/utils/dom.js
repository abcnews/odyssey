// @ts-check

import { debug } from './logging';

/**
 *
 * @param {any} node
 * @returns {node is Node}
 */
export const isNode = node => {
  return node && node instanceof Node;
};

/**
 *
 * @param {any} node
 * @returns {node is Text}
 */
export const isText = node => {
  return node && node.nodeType === Node.TEXT_NODE;
};

/**
 * Type guard for elements
 * @param {any} node
 * @returns {node is Element}
 */
export const isElement = node => {
  return !!node && node.nodeType === Node.ELEMENT_NODE;
};

/**
 * Type guard for HTML elements
 * @param {any} node
 * @returns {node is HTMLElement}
 */
export const isHTMLElement = node => {
  return isElement(Node) && node instanceof HTMLElement;
};

export const isDocument = node => {
  return node && node.nodeType === Node.DOCUMENT_NODE;
};

/**
 *
 * @param {any} el A possible anchor element
 * @returns {el is HTMLAnchorElement}
 */
export const isAnchorElement = el => el instanceof HTMLAnchorElement;

/**
 *
 * @param {any} el A possible image element
 * @returns {el is HTMLImageElement}
 */
export const isImageElement = el => el instanceof HTMLImageElement;

/**
 *
 * @param {any} el A possible video element
 * @returns {el is HTMLVideoElement}
 */
export const isVideoElement = el => el instanceof HTMLVideoElement;

/**
 *
 * @param {any} el A possible video element
 * @returns {el is HTMLProgressElement}
 */
export const isProgressElement = el => el instanceof HTMLProgressElement;

/**
 * Select a single DOM node.
 * @param {string} selector CSS selector for elements to select
 * @param {Element|Document|null} [root] Specify ancestor element to reduce selection scope.
 * @returns {Element|null}
 */
export const $ = (selector, root) => {
  root = isElement(root) ? root : document;

  return root.querySelector(selector);
};

/**
 * Select multiple elements in the DOM.
 * @param {string} selector CSS selector for elements to select
 * @param {Element|Element[]|null} [roots] Specify ancestor elements to reduce selection scope.
 * @returns {Element[]}
 */
export const $$ = (selector, roots) => {
  const r = typeof roots === 'undefined' || roots === null ? [document] : Array.isArray(roots) ? roots : [roots];
  /** @type {Element[]} */
  const init = [];

  return r.reduce((acc, root) => {
    if ('querySelectorAll' in root) {
      const results = root.querySelectorAll(selector);

      return acc.concat(Array.from(results));
    }

    return acc;
  }, init);
};
/**
 * Detatch a node from the DOM
 * @param {Node} [node]
 * @returns Node
 */
export const detach = node => {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }

  return node;
};

/**
 * Detatch an array of nodes from the DOM
 * @param {Node[]} nodes
 * @returns {(Node|undefined)[]}
 */
export const detachAll = nodes => {
  return nodes.map(detach);
};

/**
 * Append a node to the DOM
 * @param {Node} parent
 * @param {Node} node
 */
export const append = (parent, node) => {
  parent.appendChild(node);
};

/**
 * Prepend a node to the DOM
 * @param {Node} parent
 * @param {Node} node
 */
export const prepend = (parent, node) => {
  parent.insertBefore(node, parent.firstChild);
};

/**
 * Insert a node into the DOM before the specified node
 * @param {Node} sibling
 * @param {Node} node
 */
export const before = (sibling, node) => {
  if (!sibling.parentNode) {
    debug(new Error('Attempted to insert DOM node as sibling of a node with no parent.'));
    return;
  }
  sibling.parentNode.insertBefore(node, sibling);
};

/**
 * Unwrap a node from its parent element
 * @param {Node} node
 */
export const unwrap = node => {
  const parent = node.parentElement;
  if (!parent) {
    debug(new Error("Attempted to unwrap a node that doesn't have a parent."));
    return;
  }
  after(parent, node);
  detach(parent);
};

/**
 * Insert a node into the DOM after the specified node
 * @param {Node} sibling
 * @param {Node} node
 */
export const after = (sibling, node) => {
  if (!sibling.parentNode) {
    debug(new Error('Attempted to insert DOM node as sibling of a node with no parent.'));
    return;
  }
  sibling.parentNode.insertBefore(node, sibling.nextSibling);
};

/**
 * Replace a node in the DOM with another node.
 * @param {Node} node
 * @param {Node} replacementNode
 * @returns {Node|undefined} The replaced node
 */
export const substitute = (node, replacementNode) => {
  before(node, replacementNode);
  return detach(node);
};

/**
 * Set text on a node (or insert it as a first child if the first child isn't already text)
 * @param {Element} el The note to set text on
 * @param {string} text
 */
export const setText = (el, text) => {
  let node = el.firstChild;

  if (node === null || !isText(node)) {
    prepend(el, (node = document.createTextNode(text)));
  } else {
    node.nodeValue = text;
  }
};

/**
 * Set a boolean attribute on a node
 * @param {Node} node
 * @param {string} attribute
 * @param {boolean} shouldBeApplied
 */
export const toggleAttribute = (node, attribute, shouldBeApplied) => {
  node[`${shouldBeApplied ? 'set' : 'remove'}Attribute`](attribute, '');
};

/**
 * Set a collection of boolean attributes on a node
 * @param {Node} node
 * @param {Record<string, boolean>} map
 */
export const toggleBooleanAttributes = (node, map) => {
  Object.keys(map).forEach(name => {
    toggleAttribute(node, name, map[name]);
  });
};

/**
 * Get the first descendent image element.
 *
 * @param {Element} el
 * @returns {HTMLImageElement|undefined}
 */
export const getChildImage = el => {
  if (!isElement(el)) {
    return;
  }

  let imgEl = $('img', el);

  if (!imgEl || !isImageElement(imgEl)) {
    return;
  }

  // Phase 2 CustomImages appear similar to Images, but their srcsec attribute only has one URL.
  // TODO: Can this be removed?
  if (imgEl.hasAttribute('data-srcset') && imgEl.getAttribute('data-srcset')?.indexOf(', ') === -1) {
    return;
  }

  // Presentation Layer images are lazy-loaded, and need to be replaced by their fallback content
  if (isElement(imgEl.nextSibling) && imgEl.nextSibling.tagName === 'NOSCRIPT') {
    const tempParentEl = document.createElement('div');

    tempParentEl.innerHTML = imgEl.nextSibling.innerHTML;
    imgEl = $('img', tempParentEl) || imgEl;

    if (!isImageElement(imgEl)) {
      return;
    }

    if (imgEl.hasAttribute('data-src')) {
      imgEl.setAttribute('src', imgEl.getAttribute('data-src') || '');
    }
  }

  return imgEl;
};

/**
 * Get a video CMID from the DOM
 * @param {Element} node
 * @returns {string|undefined}
 */
export const detectVideoId = node => {
  let videoId;

  const isFigure = node.getAttribute('data-component') === 'Figure';
  const isVideo = $('[data-component="VideoPlayer"]', node);
  if (isFigure && isVideo) {
    videoId = node.getAttribute('data-uri')?.replace('coremedia://video/', '');
  }

  return videoId;
};
