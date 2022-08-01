import cn from 'classnames';
import html from 'bel';
import { url2cmid } from '@abcnews/url2cmid';
import { invalidateClient } from '../../scheduler';
import { track } from '../../utils/behaviour';
import { terminusFetch } from '../../utils/content';
import { $, $$, detach, prepend, substitute } from '../../utils/dom';
import Picture from '../Picture';
import './index.scss';

const PICTURE_RATIOS = {
  sm: '3x2',
  md: '3x2',
  lg: '3x2',
  xl: '3x2'
};

const WhatNextItem = ({ id, teaser, url }) => {
  const parts = teaser.split(' ');
  const splitIndex = Math.max(parts.length - 2, 0);
  const initialParts = parts.slice(0, splitIndex);
  const lastTwoParts = parts.slice(splitIndex);

  return html`
    <a href="${url}" onclick="${id ? () => track('recirculation-link', id) : null}">
      <h2>${initialParts.join(' ')} <span>${lastTwoParts.join(' ')}</span></h2>
    </a>
  `;
};

const WhatNext = ({ stories }) => {
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
};

export default WhatNext;

export const transformMarker = marker => {
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
};
