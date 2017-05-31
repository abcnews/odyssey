// External
const html = require('bel');
const dewysiwyg = require('util-dewysiwyg');

// Ours
const {SELECTORS} = require('../../constants');
const {append, before, detach, detachAll, literalList, select, selectAll, trim} = require('../../utils');
const Main = require('../components/Main');

const TEMPLATE_REMOVABLES = {
  '.platform-standard:not(.platform-mobile)': literalList(`
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
  `),
  '.platform-mobile:not(.platform-standard)': literalList(`
    header > .site
    header > .section
    .content > article
    .share
    .related
  `),
  '.platform-standard.platform-mobile': literalList(`
    #page-header
    .view-navigationPrimary
    .view-ticker
    .article-detail-page > .container-fluid > div.row
    .view-hero-media
  `)
};

const WHITESPACE_REMOVABLES = `
  p
`;

const PREVIEW_CTX_SELECTOR = 'span[id^="CTX"]';
const PREVIEW_SCRIPT_PATTERN = /(?:coremedia|joo\.classLoader)/;

const P1S_FLOAT = {
  SELECTOR: `
    .inline-content.left,
    .inline-content.right
  `,
  PATTERN: /inline-content.*(left|right)/
};

const P2_FLOAT = {
  SELECTOR: `
    .comp-embedded-float-left,
    .comp-embedded-float-right,
    [class*="view-inline"].left,
    [class*="view-inline"].right
  `,
  PATTERN: /(comp-embedded-float-|view-inline[\w-]+\s)(left|right)/,
  REPLACEMENT: 'u-pull-$2'
};

function promoteToMain(storyEl, meta) {
  const existingMainEl = select(SELECTORS.MAIN);
  const id = existingMainEl.getAttribute('id');
  const mainEl = Main(Array.from(storyEl.childNodes), meta);

  if (id) {
    mainEl.setAttribute('id', id);
    existingMainEl.removeAttribute('id');
  }

  existingMainEl.removeAttribute('role');

  before(existingMainEl, mainEl);

  return mainEl;
}

function reset(storyEl, meta) {
  // Tag indices of Phase 1 (Standard) video embeds, so we can resolve them later
  selectAll('.inline-content.video:not(.expired)')
  .forEach((el, index) => el.setAttribute('data-inline-video-data-index', index));

  storyEl = promoteToMain(storyEl, meta);

  Object.keys(TEMPLATE_REMOVABLES).forEach(templateBodySelector => {
    if (select(templateBodySelector)) {
      detachAll(selectAll(TEMPLATE_REMOVABLES[templateBodySelector]));
    }
  });

  selectAll(WHITESPACE_REMOVABLES, storyEl).forEach(el => {
    if (trim(el.textContent).length === 0) {
      detach(el);
    }
  });

  selectAll(PREVIEW_CTX_SELECTOR, storyEl).forEach(el => {
    [].slice.call(el.children).forEach(childEl => {
      if (
        childEl.tagName === 'SCRIPT' &&
        childEl.textContent.match(PREVIEW_SCRIPT_PATTERN)
      ) {
        detach(childEl);
      } else {
        before(el, childEl);
      }
    });
    detach(el);
  });

  selectAll(SELECTORS.WYSIWYG_EMBED, storyEl).forEach(el => {
    dewysiwyg.normalise(el);
    el.className = 'u-richtext';
  });

  selectAll(P1S_FLOAT.SELECTOR, storyEl).forEach(el => {
    const [, side] = el.className.match(P1S_FLOAT.PATTERN);
    const pullEl = html`<div class="u-pull-${side}"></div>`;

    el.classList.remove(side);
    el.classList.add('full');
    before(el, pullEl);
    append(pullEl, el);
  });

  selectAll(P2_FLOAT.SELECTOR, storyEl).forEach(el => {
    if (el.className.indexOf('view-') > -1) {
      const [, , side] = el.className.match(P2_FLOAT.PATTERN);
      const pullEl = html`<div class="u-pull-${side}"></div>`;

      el.classList.remove(side);
      el.classList.add('full');
      before(el, pullEl);
      append(pullEl, el);
    } else {
      el.className = el.className.replace(P2_FLOAT.PATTERN, P2_FLOAT.REPLACEMENT);
    }
  });

  // selectAll(SELECTORS.WYSIWYG_EMBED, storyEl)
  // .forEach(el => console.log(el));
  //
  // selectAll(SELECTORS.EMBED, storyEl)
  // .forEach(el => console.log(el));

  return storyEl;
}

module.exports = reset;
