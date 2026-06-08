// @ts-check
import Main from '../components/Main';
import { SELECTORS, THEME } from '../constants';
import { $, $$, append, before, detach, detachAll, isHTMLElement, unwrap } from '../utils/dom';
import { debug } from '../utils/logging';
import './index.scss';

const TEMPLATE_REMOVABLES = {
  // PL
  all: [
    '[data-component="AppDetailLayout"]',
    '[data-component="DetailLayout"]',
    '[data-component="WebContentWarning"]:has(+ *:not(#endmosaic))',
    '[data-component="NewsTicker"]',
    '[data-component="StickyHeader"]',
    ':not(aside)>[data-component="Sidebar"]'
  ].join(),
  // PL (App)
  app: 'main:not([class*="u-"])'
};

const WHITESPACE_REMOVABLES = 'p';

/**
 *
 * @param {Element} storyEl
 * @param {Partial<import('../meta').MetaData>} meta
 */
function addDescriptorHints(storyEl, meta) {
  const storyElChildElements = Array.from(storyEl.children);
  const storyElChildDescriptors = meta._articledetail.text.descriptor.children;

  storyElChildElements.forEach((childEl, index) => {
    // @ts-ignore Extensions to built in objects aren't yet typed here
    childEl._descriptor = storyElChildDescriptors[index];
  });
}

/**
 * Pull the story element up one level in the DOM
 * @param {Element} storyEl
 * @param {Partial<import('../meta').MetaData>} meta
 * @returns {Element}
 */
function promoteToMain(storyEl, meta) {
  const existingMainEl = $(SELECTORS.MAIN);
  const mainEl = Main(Array.from(storyEl.childNodes), meta);
  if (!existingMainEl) {
    debug('Could not find existing main element, not promoting.');
    return mainEl;
  }
  mainEl.setAttribute('id', existingMainEl.getAttribute('id') || '');
  existingMainEl.removeAttribute('id');
  existingMainEl.removeAttribute('role');
  before(existingMainEl, mainEl);

  return mainEl;
}

/**
 * Perform a bunch of resets to start with a clean slate.
 * @param {Element} storyEl
 * @param {Partial<import('../meta').MetaData>} meta
 * @returns {Element}
 */
export const reset = (storyEl, meta) => {
  const { isDarkMode, theme } = meta;

  // Apply minimum-scale=1 to viewport meta
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1, minimum-scale=1');

  // Apply theme, if defined
  if (typeof theme === 'string') {
    theme.split(';').forEach(definition => {
      const [prop, value] = definition.split(':');

      if (prop && value) {
        // It sometimes happens that producers use the wrong kind of dash when defining custom CSS props in the Core
        // Media interface. This cleans things up.
        const cleanProp = prop.replaceAll(/\p{Dash_Punctuation}/gu, '-');
        document.documentElement.style.setProperty(cleanProp, value);
      }
    });
  }

  // Enable dark mode, if required
  if (isDarkMode) {
    document.documentElement.classList.add('is-dark-mode');
  }

  // Add descriptor hints (for things like embed alignment resolution)
  addDescriptorHints(storyEl, meta);

  // Promote story to main
  const mainEl = promoteToMain(storyEl, meta);

  // Remove elements we don't need
  detachAll($$(TEMPLATE_REMOVABLES.all));
  if (document.location.pathname.startsWith('/newsapp/')) {
    detachAll($$(TEMPLATE_REMOVABLES.app));
  }

  // Remove elements that don't contain any text
  $$(WHITESPACE_REMOVABLES, mainEl).forEach(el => {
    if ((el.textContent || '').trim().length === 0) {
      detach(el);
    }
  });

  // Fix PL top-level links that aren't inside paragraphs.
  Array.from(mainEl.children).forEach(el => {
    if (el.tagName === 'A' && el.hasAttribute('href')) {
      const pEl = document.createElement('p');
      before(el, pEl);
      append(pEl, el);
    }
  });

  // Treat WYSIWYG teaser embeds as nested richtext content
  $$(SELECTORS.WYSIWYG_EMBED, mainEl).forEach(el => {
    if (isHTMLElement(el)) {
      const alignment = el.className.includes('ContentAlignment_floatRight')
        ? 'right'
        : el.className.includes('ContentAlignment_floatLeft')
        ? 'left'
        : 'center';
      stripPLAttributes(el);
      el.className = `u-richtext${isDarkMode ? '-invert' : ''}`;
      el.dataset.component = 'LegacyWysiwyg';
      el.dataset.theme = THEME;
      el.dataset.scheme = isDarkMode ? 'dark' : 'light';
      el.classList.add(alignment === 'left' ? 'u-pull-left' : alignment === 'right' ? 'u-pull-right' : 'u-pull-in');
    }
  });

  // Clean up Presentation Layer components
  $$('[data-component="Table"', mainEl).forEach(el => unwrap(el));

  // Remove PL classes from components we want to style for ourselves
  // Note that this doesn't successfully strip PL styles from all the components we might want to.
  // For example, we want Blockquote, EmphasisedText and Pullquote components to take styles from PL except under
  // specific circumstances such as being embedded inside a Gallery or Mosaic, so we don't strip PL attributes from
  // those elements. When Odyssey which may include these PL styled components are initialised, they may need to conduct
  // further PL attribute removal.
  $$(
    [
      '[data-component="ContentLink"]:not(#content [data-component] *)',
      '[data-component="Heading"]:not(#content [data-component] *)',
      '[data-component="Link"]:not(#content [data-component] *)', // All Link components that are decendents of mainEl but not inside a [data-component] element that's inside #content
      '[data-component="List"]:not(#content [data-component] *)',
      '[data-component="ListItem"]:not(#content [data-component] *)',
      '[data-component="Table"]:not(#content [data-component] *)',
      '#content > p', // All p elements that are direct children of mainEl
      'p:not(#content [data-component] *)' // All p elements that are decendents of mainEl but not inside a [data-component] element that's inside .Main
    ].join(),
    mainEl
  ).forEach(stripPLAttributes);

  return mainEl;
};

/**
 * @param {Element} el
 */
export const stripPLAttributes = el => {
  el.removeAttribute('class');
  el.removeAttribute('data-component');

  // There are some circumstances (e.g. A link inside a list) where the decendent elements will not be selected by the
  // above selectors, so we further strip relevant attributes from all decendents here.
  $$('*', el).forEach(subEl => {
    subEl.removeAttribute('class');
    subEl.removeAttribute('data-component');
  });
};
