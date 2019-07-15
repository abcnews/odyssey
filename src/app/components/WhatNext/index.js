// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const { invalidateClient } = require('../../scheduler');
const { track } = require('../../utils/behaviour');
const { terminusFetch } = require('../../utils/content');
const { $, $$, detach, prepend, substitute } = require('../../utils/dom');
const Picture = require('../Picture');
require('./index.scss');

const PICTURE_RATIOS = {
  sm: '3x2',
  md: '3x2',
  lg: '3x2',
  xl: '3x2'
};

function WhatNextItem({ id, teaser, url }) {
  const parts = teaser.split(' ');
  const splitIndex = Math.max(parts.length - 2, 0);
  const initialParts = parts.slice(0, splitIndex);
  const lastTwoParts = parts.slice(splitIndex);

  return html`
    <a href="${url}" onclick="${id ? () => track('recirculation-link', id) : null}">
      <h2>${initialParts.join(' ')} <span>${lastTwoParts.join(' ')}</span></h2>
    </a>
  `;
}

function WhatNext({ stories }) {
  const itemEls = stories.map(WhatNextItem);

  stories.forEach(({ id, teaser }, index) => {
    if (!id) {
      return;
    }

    terminusFetch(id, (err, item) => {
      if (err || !item._embedded.mediaThumbnail) {
        return;
      }

      if (item.docType === 'Teaser') {
        const teasedItem = WhatNextItem({ id: item.target.id, teaser, url: `/news/${item.target.id}` });

        substitute(itemEls[index], teasedItem);
        itemEls[index] = teasedItem;
      }

      prepend(itemEls[index], Picture({ src: item._embedded.mediaThumbnail.complete[0].url, ratios: PICTURE_RATIOS }));
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
