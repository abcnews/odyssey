// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const { MOCK_ELEMENT } = require('../../../constants');
const { track } = require('../../utils/behaviour');
const { $, $$, detach, getChildImage, substitute } = require('../../utils/dom');
require('./index.scss');

const CURRENT_STORY_ID = url2cmid(window.location.href);

function Series({ stories, options = {} }) {
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
                  ${thumbnail}
                  ${kicker
                    ? html`
                        <label>${kicker}</label>
                      `
                    : null} <span>${title}</span>
                </a>
              `
            : html`
                <div aria-current="${isCurrent ? 'page' : 'false'}">
                  ${thumbnail}
                  ${kicker
                    ? html`
                        <label>${kicker}</label>
                      `
                    : null}
                  <span
                    >${title}${isCurrent
                      ? [
                          ' ',
                          html`
                            <i></i>
                          `
                        ]
                      : null}</span
                  >
                </div>
              `
        )}
    </div>
  `;
}

function transformMarker(marker) {
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
    const linkEl = (listItemEl.firstChild || MOCK_ELEMENT).tagName === 'A' ? listItemEl.firstChild : null;
    const isCurrent = linkEl && url2cmid(linkEl.href) === CURRENT_STORY_ID;
    const textParts = (linkEl ? linkEl.textContent : listItemEl.firstChild.nodeValue).split(': ');
    const thumbnailImageEl = getChildImage(listItemEl);

    return {
      isCurrent,
      kicker: textParts.length > 1 ? textParts[0] : null,
      thumbnail: thumbnailImageEl ? thumbnailImageEl.cloneNode(true) : null,
      title: textParts[textParts.length - 1],
      url: linkEl ? linkEl.href : ''
    };
  });

  const options = {
    isRest: marker.configSC.indexOf('rest') > -1
  };

  substitute(listEl, Series({ stories, options }));
  detach(marker.node);
}

module.exports = Series;
module.exports.transformMarker = transformMarker;
