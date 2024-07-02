// @ts-check
import { url2cmid } from '@abcnews/url2cmid';
import cn from 'classnames';
import html from 'nanohtml';
import { track } from '../../utils/behaviour';
import { $, $$, detach, getChildImage, isAnchorElement, isImageElement, substitute } from '../../utils/dom';
import styles from './index.lazy.scss';

/**
 * @typedef {Object} SeriesOptions
 * @prop {boolean} isRest
 */

/**
 * @typedef {Object} SeriesStory
 * @prop {boolean} isCurrent
 * @prop {string} kicker
 * @prop {Node | null} thumbnail
 * @prop {string} title
 * @prop {string} url
 */

const CURRENT_STORY_ID = url2cmid(window.location.href);

/**
 * Create a series component
 * @param {Object} SeriesConfig
 * @param {SeriesStory[]} SeriesConfig.stories
 * @param {Partial<SeriesOptions>} SeriesConfig.options
 * @returns
 */
const Series = ({ stories, options = {} }) => {
  const className = cn('Series', {
    'has-m2r1': stories.length % 2 === 1,
    'has-m3r1': stories.length % 3 === 1,
    'has-m3r2': stories.length % 3 === 2
  });

  styles.use();

  return html`
    <div role="navigation" class="${className}">
      ${stories
        .filter(({ isCurrent }) => !options.isRest || !isCurrent)
        .map(({ isCurrent, kicker, thumbnail, title, url }) =>
          url && !isCurrent
            ? html`
                <a href="${url}" onclick="${() => track('series-link', url2cmid(url) || '')}" aria-current="false">
                  ${thumbnail} ${kicker ? html`<label>${kicker}</label>` : null} <span>${title}</span>
                </a>
              `
            : html`
                <div aria-current="${isCurrent ? 'page' : 'false'}">
                  ${thumbnail} ${kicker ? html`<label>${kicker}</label>` : null}
                  <span>${title}${isCurrent ? [' ', html`<i></i> `] : null}</span>
                </div>
              `
        )}
    </div>
  `;
};

export default Series;

/**
 * Parse the DOM and setup a Series component
 * @param {import('src/app/utils/mounts').Marker} marker
 * @returns {void}
 */
export const transformMarker = marker => {
  const nextEl = marker.node.nextElementSibling;

  if (!nextEl) {
    return;
  }

  const listEl = nextEl.tagName === 'OL' || nextEl.tagName === 'UL' ? nextEl : $('ol, ul', nextEl);

  if (!listEl) {
    return;
  }

  const listItemEls = $$('li', listEl);

  if (!listItemEls.length) {
    return;
  }

  const stories = listItemEls.flatMap(listItemEl => {
    const linkEl = $('a', listItemEl);

    const isCurrent = isAnchorElement(linkEl) && url2cmid(linkEl.href) === CURRENT_STORY_ID;
    const [title, kicker] = ((linkEl || listItemEl).textContent || '').split(': ').reverse();
    const thumbnailImageEl = getChildImage(listItemEl)?.cloneNode(true);

    if (isImageElement(thumbnailImageEl)) {
      thumbnailImageEl.className = '';
    }

    return [
      {
        isCurrent,
        kicker,
        thumbnail: thumbnailImageEl || null,
        title,
        url: isAnchorElement(linkEl) ? linkEl.href : ''
      }
    ];
  });

  const options = {
    isRest: marker.configString.indexOf('rest') > -1
  };

  substitute(listEl, Series({ stories, options }));
  detach(marker.node);
};
