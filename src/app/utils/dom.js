import { url2cmid } from '@abcnews/url2cmid';

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

export const isText = node => {
  return node && node.nodeType === Node.TEXT_NODE;
};

export const isElement = node => {
  return node && node.nodeType === Node.ELEMENT_NODE;
};

export const isInlineElement = node => {
  return isElement(node) && INLINE_TAG_NAMES.indexOf(node.tagName.toLowerCase()) > -1;
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

export const setOrAddMetaTag = (name, content) => {
  let el = $(`meta[name="${name}"]`);

  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }

  el.setAttribute('content', content);
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
};
