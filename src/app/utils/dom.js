export const isText = node => {
  return node && node.nodeType === Node.TEXT_NODE;
};

export const isElement = node => {
  return node && node.nodeType === Node.ELEMENT_NODE;
};

export const isDocument = node => {
  return node && node.nodeType === Node.DOCUMENT_NODE;
};

export const $ = (selector, root) => {
  root = isElement(root) ? root : document;

  return root.querySelector(selector);
};

export const select = $;

export const $$ = (selector, roots) => {
  roots = Array.isArray(roots) ? roots : [roots];
  roots = isElement(roots[0]) ? roots : [document];

  return roots.reduce((acc, root) => {
    if ('querySelectorAll' in root) {
      const results = root.querySelectorAll(selector);

      return acc.concat(Array.from(results));
    }

    return acc;
  }, []);
};

export const selectAll = $$;

export const detach = (node = {}) => {
  if (node != null && node.parentNode) {
    node.parentNode.removeChild(node);
  }

  return node;
};

export const detachAll = nodes => {
  return nodes.map(detach);
};

export const append = (parent, node) => {
  parent.appendChild(node);
};

export const prepend = (parent, node) => {
  parent.insertBefore(node, parent.firstChild);
};

export const before = (sibling, node) => {
  sibling.parentNode.insertBefore(node, sibling);
};

export const after = (sibling, node) => {
  sibling.parentNode.insertBefore(node, sibling.nextSibling);
};

export const substitute = (node, replacementNode) => {
  before(node, replacementNode);

  return detach(node);
};

export const setText = (el, text) => {
  let node = el.firstChild;

  if (node === null || !isText(node)) {
    prepend(el, (node = document.createTextNode(text)));
  } else {
    node.nodeValue = text;
  }
};

export const toggleAttribute = (node, attribute, shouldBeApplied) => {
  node[`${shouldBeApplied ? 'set' : 'remove'}Attribute`](attribute, '');
};

export const toggleBooleanAttributes = (node, map) => {
  Object.keys(map).forEach(name => {
    toggleAttribute(node, name, map[name]);
  });
};

export const getChildImage = el => {
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
    imgEl = $('img', tempParentEl) || imgEl;

    if (imgEl.hasAttribute('data-src')) {
      imgEl.setAttribute('src', imgEl.getAttribute('data-src'));
    }
  }

  return imgEl;
};

export const detectVideoId = node => {
  let videoId;

  if (
    node.getAttribute('data-component') === 'Figure' &&
    $('[data-component="PlayerButton"][aria-label*="Video"]', node)
  ) {
    videoId = ($('[data-component="Player"] div[id]', node) || {}).id;
  }

  return videoId;
};
