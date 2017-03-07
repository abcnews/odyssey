// External
const html = require('bel');

// Ours
const Main = require('../components/Main');
const {SELECTORS} = require('../../constants');
const {slice, literalList, select, selectAll, detachAll, before} = require('../../utils');

const P1S = literalList(`
  #container_header
  #container_nav
  .ticker
  .page:not(.featured-scroller):not([id])
  h1
  .tools
  .byline
  .published
  .attached-content
  .authorpromo
  .newsFromOtherSites
`);

const P1M = literalList(`
  header > .site
  header > .section
  .content > article
  .share
  .related
`);

const P2 = literalList(`
  #page-header
  .view-navigationPrimary
  .view-ticker
  .article-detail-page > .container-fluid > div.row
  .view-hero-media
`);

function promoteToMain(storyEl) {
  const existingMainEl = select(SELECTORS.MAIN);
  const id = existingMainEl.getAttribute('id');
  const mainEl = Main(slice(storyEl.childNodes));

  if (id) {
    mainEl.setAttribute('id', id);
    existingMainEl.removeAttribute('id');
  }

  before(existingMainEl, mainEl);

  return mainEl;
}

function reset(storyEl) {
  storyEl = promoteToMain(storyEl);

  detachAll(selectAll(P1S));
  detachAll(selectAll(P1M));
  detachAll(selectAll(P2));

  return storyEl;
}

module.exports = reset;
