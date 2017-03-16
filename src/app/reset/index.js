// External
const html = require('bel');
const dewysiwyg = require('util-dewysiwyg');

// Ours
const Main = require('../components/Main');
const UPull = require('../components/UPull');
const {SELECTORS} = require('../../constants');
const {append, before, detachAll, literalList, select, selectAll, slice} = require('../../utils');

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

  selectAll(SELECTORS.WYSIWYG_EMBED, storyEl).forEach(el => {
    dewysiwyg.normalise(el);
    el.className = 'u-richtext';
  });

  selectAll('.comp-embedded-float-left', storyEl).forEach(el => {
    el.className = el.className.replace('comp-embedded-float-left', 'u-pull-left');
  });

  selectAll('.comp-embedded-float-right', storyEl).forEach(el => {
    el.className = el.className.replace('comp-embedded-float-right', 'u-pull-right');
  });

  selectAll('.inline-content.left', storyEl).forEach(el => {
    const pullEl = html`<div class="u-pull-left"></div>`;

    el.classList.remove('inline-content', 'left');
    before(el, pullEl);
    append(pullEl, el);
  });

  selectAll('.inline-content.right', storyEl).forEach(el => {
    const pullEl = html`<div class="u-pull-right"></div>`;

    el.classList.remove('inline-content', 'right');
    before(el, pullEl);
    append(pullEl, el);
  });

  // const leftClassList = SELECTORS.LEFT_EMBED.replace(/\.|,/g, ' ').split(' ').filter(x => x);
  // console.log(leftClassList);
  // selectAll(SELECTORS.LEFT_EMBED, storyEl)
  // .forEach(el => {
  //   el.classList.remove.apply(el.classList, leftClassList);
  //   el.classList.add('u-pull-left');
  //   console.log(el);
  // });

  // selectAll(SELECTORS.WYSIWYG_EMBED, storyEl)
  // .forEach(el => console.log(el));
  //
  // selectAll(SELECTORS.EMBED, storyEl)
  // .forEach(el => console.log(el));

  detachAll(selectAll(P1S));
  detachAll(selectAll(P1M));
  detachAll(selectAll(P2));

  return storyEl;
}

module.exports = reset;
