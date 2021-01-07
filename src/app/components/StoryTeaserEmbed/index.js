// External
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const { track } = require('../../utils/behaviour');
const { $, $$, getChildImage, substitute } = require('../../utils/dom');
const { trim } = require('../../utils/misc');
require('./index.scss');

function StoryTeaserEmbed({ title, description, url, imageURL }) {
  const id = url2cmid(url);

  return html`
    <aside class="StoryTeaserEmbed">
      <a href="${url}" onclick="${id ? () => track('recirculation-link', id) : null}">
        <h2>${title}</h2>
        <img src="${imageURL}" />
        <p>${description}</p>
      </a>
    </aside>
  `;
}

function isPLRelatedCard(el) {
  return el.getAttribute('data-component') === 'RelatedCard';
}

function doesElMatchConvention(el) {
  // We only accept PL Related Cards or P1/2 WYSIWYG teasers that have
  // a title, a _self-targeting link and an image, but don't bundle an
  // interactive (such as the podcast player).
  return (
    isPLRelatedCard(el) ||
    !!($('h2', el) && $$('a[target="_self"]', el).length === 3 && getChildImage(el) && !$('.init-interactive', el))
  );
}

function transformEl(el) {
  const title = $('h2,h3', el).textContent;
  const url = $('a', el).getAttribute('href');
  const imageURL = getChildImage(el).getAttribute('src');

  if (!title || !url || !imageURL) {
    return;
  }

  if (isPLRelatedCard(el)) {
    const pullRightWrapperEl = html`<div class="u-pull-right"></div>`;

    substitute(el, pullRightWrapperEl);
    pullRightWrapperEl.appendChild(el);

    $$('noscript', el).forEach(noscriptEl => noscriptEl.parentElement.removeChild(noscriptEl));
  }

  const description = trim(
    String(el.textContent)
      .replace(title, '')
      .replace('Read more', '')
      .replace(/\.{1}(\S)/g, '. $1')
  );

  substitute(el, StoryTeaserEmbed({ title, url, imageURL, description }));
}

module.exports = StoryTeaserEmbed;
module.exports.doesElMatchConvention = doesElMatchConvention;
module.exports.transformEl = transformEl;
