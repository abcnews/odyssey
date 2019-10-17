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

function doesElMatchConvention(el) {
  // We only accept teasers that have a title, a _self-targeting link and
  // an image, but not bundle an interactive (such as the podcast player).
  return !!(
    $('h2', el) &&
    $$('a[target="_self"]', el).length === 3 &&
    getChildImage(el) &&
    !$('.init-interactive', el)
  );
}

function transformEl(el) {
  const title = $('h2', el).textContent;
  const description = trim(String(el.textContent).replace(title, ''));
  const url = $('a', el).getAttribute('href');
  const imageURL = getChildImage(el).getAttribute('src');

  if (!title || !description || !url || !imageURL) {
    return;
  }

  substitute(el, StoryTeaserEmbed({ title, description, url, imageURL }));
}

module.exports = StoryTeaserEmbed;
module.exports.doesElMatchConvention = doesElMatchConvention;
module.exports.transformEl = transformEl;
