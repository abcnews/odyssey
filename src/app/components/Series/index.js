// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const {before, detach, isElement, selectAll} = require('../../../utils');

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
    <div class="${className}">
      ${stories.map(story => html`
        <div class="${story.url ? '' : 'is-current'}">
          ${story.kicker ? html`<label>${story.kicker}</label>` : null}
          <h3>
            ${story.url ? html`<a href="${story.url}">${story.title}</a>` : story.title}
          </h3>
        </div>
      `)}
    </div>
  `;
}

function transformEl(el) {
  const stories = selectAll('a', el).map(linkEl => {
    const linkTextParts = linkEl.textContent.split(': ');

    return {
      url: url2cmid(linkEl.href) === CURRENT_STORY_ID ? '' : linkEl.href,
      kicker: linkTextParts.length > 1 ? linkTextParts[0] : null,
      title: linkTextParts[linkTextParts.length - 1]
    };
  });

  before(el, Series({stories}));
  detach(el);
}

module.exports = Series;
module.exports.transformEl = transformEl;
