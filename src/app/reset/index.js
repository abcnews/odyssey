// External
const html = require('bel');
const dewysiwyg = require('util-dewysiwyg');

// Ours
const { SELECTORS } = require('../../constants');
const Main = require('../components/Main');
const { $, $$, append, before, detach, detachAll, setOrAddMetaTag } = require('../utils/dom');
const { literalList, trim } = require('../utils/misc');
require('./index.scss');

const TEMPLATE_REMOVABLES = {
  // P1S
  '.platform-standard:not(.platform-mobile)': literalList(`
    #container_header
    #container_subheader
    #container_nav
    .ticker
    .ticker-container
    .page:not(.featured-scroller):not([id])
    h1
    .tools
    .byline
    .published
    .attached-content
    .authorpromo
    .statepromo
    .newsFromOtherSites
    .topics
  `),
  // P1M
  '.platform-mobile:not(.platform-standard)': literalList(`
    header > .site
    header > .section
    .ticker-container
    .content > article
    .share
    .related:not(.m-recirc)
  `),
  // P2
  '.platform-standard.platform-mobile': literalList(`
    #page-header
    .view-navigationPrimary
    .view-collection-subbanner-placed
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

function addIE11StyleHint() {
  if ('-ms-scroll-limit' in document.documentElement.style && '-ms-ime-align' in document.documentElement.style) {
    document.documentElement.setAttribute('ie11', '');
  }
}

function resetMetaViewport() {
  setOrAddMetaTag('viewport', 'width=device-width, initial-scale=1, minimum-scale=1');

}

function promoteToMain(storyEl, meta) {
  const existingMainEl = $(SELECTORS.MAIN);
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
  // Try to feature-detect IE11, and apply an attribute to the root element for fallback styles to target
  addIE11StyleHint();

  // Update (or add) the meta viewport tag so that touch devices don't introduce a click delay
  resetMetaViewport();

  // Apply theme, if defined
  if (typeof meta.theme === 'string') {
    meta.theme.split(';').forEach(definition => {
      const [prop, value] = definition.split(':');

      if (prop && value) {
        document.documentElement.style.setProperty(prop, value);
      }
    });
  }

  // Enable dark mode, if required
  if (meta.isDarkMode) {
    document.documentElement.classList.add('is-dark-mode');
  }

  storyEl = promoteToMain(storyEl, meta);

  Object.keys(TEMPLATE_REMOVABLES).forEach(templateBodySelector => {
    if ($(templateBodySelector)) {
      detachAll($$(TEMPLATE_REMOVABLES[templateBodySelector]));
    }
  });

  $$(WHITESPACE_REMOVABLES, storyEl).forEach(el => {
    if (trim(el.textContent).length === 0) {
      detach(el);
    }
  });

  $$(SELECTORS.WYSIWYG_EMBED, storyEl).forEach(el => {
    dewysiwyg.normalise(el);
    el.className = `${el.className} u-richtext${meta.isDarkMode ? '-invert' : ''}`;
  });

  $$(P1S_FLOAT.SELECTOR, storyEl).forEach(el => {
    const [, side] = el.className.match(P1S_FLOAT.PATTERN);
    const pullEl = html`
      <div class="u-pull-${side}"></div>
    `;

    el.classList.remove(side);
    el.classList.add('full');
    before(el, pullEl);
    append(pullEl, el);
  });

  $$(P2_FLOAT.SELECTOR, storyEl).forEach(el => {
    if (el.className.indexOf('view-') > -1) {
      const [, , side] = el.className.match(P2_FLOAT.PATTERN);
      const pullEl = html`
        <div class="u-pull-${side}"></div>
      `;

      el.classList.remove(side);
      el.classList.add('full');
      before(el, pullEl);
      append(pullEl, el);
    } else {
      el.className = el.className.replace(P2_FLOAT.PATTERN, P2_FLOAT.REPLACEMENT);
    }
  });

  $$(PREVIEW_CTX_SELECTOR, storyEl).forEach(el => {
    Array.from(el.children).forEach(childEl => {
      if (childEl.tagName === 'SCRIPT' && childEl.textContent.match(PREVIEW_SCRIPT_PATTERN)) {
        detach(childEl);
      } else {
        before(el, childEl);
      }
    });
    detach(el);
  });

  return storyEl;
}

module.exports.reset = reset;
