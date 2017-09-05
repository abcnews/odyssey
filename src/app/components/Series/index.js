// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const {$$, isElement, substitute} = require('../../utils/dom');
require('./index.scss');

const CURRENT_STORY_ID = url2cmid(window.location.href);

function Series({
  stories
}) {
  const className = cn('Series', {
    'has-m2r1': stories.length % 2 === 1,
    'has-m3r1': stories.length % 3 === 1,
    'has-m3r2': stories.length % 3 === 2
  });

  return html`
    <div role="navigation" class="${className}">
      ${stories.map(story => html`
        <a href="${story.url}" aria-current="${story.url ? 'false' : 'page'}">
          ${story.kicker ? html`<label>${story.kicker}</label>` : null}
          <span>${story.title}</span>
        </a>
      `)}
    </div>
  `;
}

function transformEl(el) {
  const stories = $$('a', el).map(linkEl => {
    const linkTextParts = linkEl.textContent.split(': ');

    return {
      url: url2cmid(linkEl.href) === CURRENT_STORY_ID ? '' : linkEl.href,
      kicker: linkTextParts.length > 1 ? linkTextParts[0] : null,
      title: linkTextParts[linkTextParts.length - 1]
    };
  });

  substitute(el, Series({stories}));
}

module.exports = Series;
module.exports.transformEl = transformEl;
