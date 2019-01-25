const INLINE_TAG_NAMES = [
  'b',
  'big',
  'br',
  'i',
  'small',
  'tt',
  'abbr',
  'acronym',
  'cite',
  'code',
  'dfn',
  'em',
  'kbd',
  'strong',
  'samp',
  'time',
  'var',
  'a',
  'bdo',
  'img',
  'map',
  'object',
  'q',
  'script',
  'span',
  'sub',
  'sup',
  'button',
  'input',
  'label',
  'select',
  'textarea'
];

export function isText(node) {
  return node && node.nodeType === Node.TEXT_NODE;
}

export function isElement(node) {
  return node && node.nodeType === Node.ELEMENT_NODE;
}

function isInlineElement(node) {
  return isElement(node) && INLINE_TAG_NAMES.indexOf(node.tagName.toLowerCase()) > -1;
}

export function isDocument(node) {
  return node && node.nodeType === Node.DOCUMENT_NODE;
}

export function $(selector, root) {
  root = isElement(root) ? root : document;

  return root.querySelector(selector);
}

export const select = $; // Alias

export function $$(selector, roots) {
  roots = Array.isArray(roots) ? roots : [roots];
  roots = isElement(roots[0]) ? roots : [document];

  return roots.reduce((acc, root) => {
    if ('querySelectorAll' in root) {
      const results = root.querySelectorAll(selector);

      return acc.concat(Array.from(results));
    }

    return acc;
  }, []);
}

export const selectAll = $$; // Alias

export function detach(node = {}) {
  if (node != null && node.parentNode) {
    node.parentNode.removeChild(node);
  }

  return node;
}

export function detachAll(nodes) {
  return nodes.map(detach);
}

export function append(parent, node) {
  parent.appendChild(node);
}

export function prepend(parent, node) {
  parent.insertBefore(node, parent.firstChild);
}

export function before(sibling, node) {
  sibling.parentNode.insertBefore(node, sibling);
}

export function after(sibling, node) {
  sibling.parentNode.insertBefore(node, sibling.nextSibling);
}

export function substitute(node, replacementNode) {
  before(node, replacementNode);

  return detach(node);
}

export function setText(el, text) {
  let node = el.firstChild;

  if (node === null || !isText(node)) {
    prepend(el, (node = document.createTextNode(text)));
  } else {
    node.nodeValue = text;
  }
}

export function toggleAttribute(node, attribute, shouldBeApplied) {
  node[`${shouldBeApplied ? 'set' : 'remove'}Attribute`](attribute, '');
}

export function toggleBooleanAttributes(node, map) {
  Object.keys(map).forEach(name => {
    toggleAttribute(node, name, map[name]);
  });
}
