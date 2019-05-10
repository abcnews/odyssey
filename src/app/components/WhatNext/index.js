// External
const capiFetch = require('@abcnews/capi-fetch').default;
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const { invalidateClient } = require('../../scheduler');
const { track } = require('../../utils/behaviour');
const { $, $$, detach, prepend, substitute } = require('../../utils/dom');
const Picture = require('../Picture');
require('./index.scss');

const PICTURE_RATIOS = {
  sm: '3x2',
  md: '3x2',
  lg: '3x2',
  xl: '3x2'
};

function WhatNext({ stories }) {
  const itemEls = stories.map(({ id, teaser, url }, index) => {
    const parts = teaser.split(' ');
    const splitIndex = Math.max(parts.length - 2, 0);
    const initialParts = parts.slice(0, splitIndex);
    const lastTwoParts = parts.slice(splitIndex);

    return html`
      <a href="${url}" onclick="${id ? () => track('recirculation-link', id) : null}">
        <h2>${initialParts.join(' ')} <span>${lastTwoParts.join(' ')}</span></h2>
      </a>
    `;
  });

  stories.forEach(({ id }, index) => {
    if (!id) {
      return;
    }

    capiFetch(id, (err, item) => {
      if (err || !item.thumbnailLink) {
        return;
      }

      prepend(itemEls[index], Picture({ src: item.thumbnailLink.media[0].url, ratios: PICTURE_RATIOS }));
      invalidateClient();
    });
  });

  return html`
    <div
      role="navigation"
      class="${`WhatNext${itemEls.length > 2 ? ' u-pull' : ''}`}"
      data-length="${itemEls.reduce(
        (memo, el, index) => `${memo} gt${index}`,
        `${itemEls.length} ${itemEls.length % 2 ? 'odd' : 'even'}`
      )}"
    >
      ${itemEls}
    </div>
  `;
}

function transformMarker(marker) {
  if (!window.CSS || typeof CSS.supports !== 'function' || !CSS.supports('display', 'grid')) {
    return;
  }

  const nextEl = marker.node.nextElementSibling;

  if (!nextEl || (nextEl.tagName !== 'OL' && nextEl.tagName !== 'UL')) {
    return;
  }

  const listItemEls = $$('li', nextEl);

  if (listItemEls.length < 2) {
    return;
  }

  const stories = listItemEls.reduce((memo, listItemEl) => {
    const linkEl = $('a', listItemEl);

    if (linkEl) {
      memo.push({ id: url2cmid(linkEl.href), teaser: linkEl.textContent, url: linkEl.href });
    }

    return memo;
  }, []);

  if (!stories.length) {
    return;
  }

  substitute(nextEl, WhatNext({ stories }));
  detach(marker.node);
}

module.exports = WhatNext;
module.exports.transformMarker = transformMarker;
