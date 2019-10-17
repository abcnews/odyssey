const url2cmid = require('util-url2cmid');

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

function isText(node) {
  return node && node.nodeType === Node.TEXT_NODE;
}

function isElement(node) {
  return node && node.nodeType === Node.ELEMENT_NODE;
}

function isInlineElement(node) {
  return isElement(node) && INLINE_TAG_NAMES.indexOf(node.tagName.toLowerCase()) > -1;
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

      return acc.concat(Array.from(results));
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
    prepend(el, (node = document.createTextNode(text)));
  } else {
    node.nodeValue = text;
  }
}

function toggleAttribute(node, attribute, shouldBeApplied) {
  node[`${shouldBeApplied ? 'set' : 'remove'}Attribute`](attribute, '');
}

function toggleBooleanAttributes(node, map) {
  Object.keys(map).forEach(name => {
    toggleAttribute(node, name, map[name]);
  });
}

function setOrAddMetaTag(name, content) {
  let el = $(`meta[name="${name}"]`);

  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }

  el.setAttribute('content', content);
}

function getChildImage(el) {
  if (!isElement(el)) {
    return;
  }

  let imgEl = $('img', el);

  if (!imgEl) {
    return;
  }

  // Phase 2 CustomImages appear similar to Images, but their srcsec attribute only has one URL.
  if (imgEl.hasAttribute('data-srcset') && imgEl.getAttribute('data-srcset').indexOf(', ') === -1) {
    return;
  }

  // Presentation Layer images are lazy-loaded, and need to be replaced by their fallback content
  if (imgEl.nextSibling && imgEl.nextSibling.tagName === 'NOSCRIPT') {
    const tempParentEl = document.createElement('div');

    tempParentEl.innerHTML = imgEl.nextSibling.innerHTML;
    imgEl = $('img', tempParentEl);
  }

  return imgEl;
}

function detectVideoId(node) {
  const classList = node.className.split(' ');
  const linkEl = $('a[href]', node);
  let videoId;

  // P1 & P2
  if (linkEl) {
    videoId =
      ((classList.indexOf('inline-content') > -1 && classList.indexOf('video') > -1) ||
        (classList.indexOf('view-inlineMediaPlayer') > -1 && classList.indexOf('doctype-abcvideo') > -1) ||
        (classList.indexOf('view-hero-media') > -1 && $('.view-inlineMediaPlayer.doctype-abcvideo', node)) ||
        (classList.indexOf('embed-content') > -1 && $('.type-video', node))) &&
      url2cmid(linkEl.getAttribute('href'));
  }

  // PL
  if (
    !videoId &&
    node.getAttribute('data-component') === 'Figure' &&
    $('[data-component="PlayerButton"][aria-label*="Video"]', node)
  ) {
    videoId = ($('[data-component="Player"] div[id]', node) || {}).id;
  }

  return videoId;
}

module.exports = {
  isText,
  isElement,
  isDocument,
  $,
  $$,
  detach,
  detachAll,
  append,
  prepend,
  before,
  after,
  substitute,
  setText,
  toggleAttribute,
  toggleBooleanAttributes,
  setOrAddMetaTag,
  getChildImage,
  detectVideoId,
  // Deprecated API
  select: $,
  selectAll: $$
};
