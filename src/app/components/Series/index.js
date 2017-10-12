// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const { MOCK_ELEMENT } = require('../../../constants');
const { $, $$, isElement, substitute } = require('../../utils/dom');
require('./index.scss');

const CURRENT_STORY_ID = url2cmid(window.location.href);

function Series({ stories }) {
  const className = cn('Series', {
    'has-m2r1': stories.length % 2 === 1,
    'has-m3r1': stories.length % 3 === 1,
    'has-m3r2': stories.length % 3 === 2
  });

  return html`
    <div role="navigation" class="${className}">
      ${stories.map(
        ({ isCurrent, kicker, thumbnail, title, url }) =>
          url && !isCurrent
            ? html`
              <a href="${url}" aria-current="false">
                ${thumbnail}
                ${kicker ? html`<label>${kicker}</label>` : null}
                <span>${title}</span>
              </a>
            `
            : html`
              <div aria-current="${isCurrent ? 'page' : 'false'}">
                ${thumbnail}
                ${kicker ? html`<label>${kicker}</label>` : null}
                <span>${title}</span>
              </div>
            `
      )}
    </div>
  `;
}

function transformEl(el) {
  const stories = $$('li', el).map(listItemEl => {
    const linkEl = (listItemEl.firstChild || MOCK_ELEMENT).tagName === 'A' ? listItemEl.firstChild : null;
    const isCurrent = linkEl && url2cmid(linkEl.href) === CURRENT_STORY_ID;
    const textParts = (linkEl ? linkEl.textContent : listItemEl.firstChild.nodeValue).split(': ');
    const thumbnailImageEl = $('img', listItemEl);

    return {
      isCurrent,
      kicker: textParts.length > 1 ? textParts[0] : null,
      thumbnail: thumbnailImageEl ? thumbnailImageEl.cloneNode(true) : null,
      title: textParts[textParts.length - 1],
      url: linkEl ? linkEl.href : ''
    };
  });

  substitute(el, Series({ stories }));
}

module.exports = Series;
module.exports.transformEl = transformEl;
