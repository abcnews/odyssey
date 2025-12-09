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
    '[data-component="WebContentWarning"]',
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
        document.documentElement.style.setProperty(prop, value);
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
    el.className = `u-richtext${isDarkMode ? '-invert' : ''}`;
    if (isHTMLElement(el)) {
      el.dataset.theme = THEME;
      el.dataset.scheme = isDarkMode ? 'dark' : 'light';
    }
  });

  // Clean up Presentation Layer components
  $$('[data-component="Table"', mainEl).forEach(el => unwrap(el));

  $$(
    [
      '[data-component="ContentLink"]',
      '[data-component="Heading"]',
      '[data-component="Link"]',
      '[data-component="List"]',
      '[data-component="ListItem"]',
      '[data-component="Table"]',
      'p'
    ].join(),
    mainEl
  ).forEach(el => {
    el.removeAttribute('class');
    el.removeAttribute('data-component');
  });

  return mainEl;
};
