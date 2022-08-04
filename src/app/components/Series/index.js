import { url2cmid } from '@abcnews/url2cmid';
import cn from 'classnames';
import html from 'nanohtml';
import { track } from '../../utils/behaviour';
import { $, $$, detach, getChildImage, substitute } from '../../utils/dom';
import './index.scss';

const CURRENT_STORY_ID = url2cmid(window.location.href);

const Series = ({ stories, options = {} }) => {
  const className = cn('Series', {
    'has-m2r1': stories.length % 2 === 1,
    'has-m3r1': stories.length % 3 === 1,
    'has-m3r2': stories.length % 3 === 2
  });

  return html`
    <div role="navigation" class="${className}">
      ${stories
        .filter(({ isCurrent }) => !options.isRest || !isCurrent)
        .map(({ isCurrent, kicker, thumbnail, title, url }) =>
          url && !isCurrent
            ? html`
                <a href="${url}" onclick="${() => track('series-link', url2cmid(url))}" aria-current="false">
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

export const transformMarker = marker => {
  const nextEl = marker.node.nextElementSibling;
  const listEl = nextEl.tagName === 'OL' || nextEl.tagName === 'UL' ? nextEl : $('ol, ul', nextEl);

  if (!listEl) {
    return;
  }

  const listItemEls = $$('li', listEl);

  if (!listItemEls.length) {
    return;
  }

  const stories = listItemEls.map(listItemEl => {
    const linkEl = $('a', listItemEl);
    const isCurrent = linkEl && url2cmid(linkEl.href) === CURRENT_STORY_ID;
    const [title, kicker] = (linkEl || listItemEl).textContent.split(': ').reverse();
    const thumbnailImageEl = getChildImage(listItemEl);

    return {
      isCurrent,
      kicker,
      thumbnail: thumbnailImageEl ? thumbnailImageEl.cloneNode(true) : null,
      title,
      url: linkEl ? linkEl.href : ''
    };
  });

  const options = {
    isRest: marker.configString.indexOf('rest') > -1
  };

  substitute(listEl, Series({ stories, options }));
  detach(marker.node);
};
