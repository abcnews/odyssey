import Main from '../components/Main';
import { SELECTORS } from '../constants';
import { $, $$, append, before, detach, detachAll } from '../utils/dom';
import './index.scss';

const TEMPLATE_REMOVABLES = {
  // PL
  'link[data-chunk="main"],link[data-chunk^="page."]': [
    '[data-component="AppDetailLayout"]',
    '[data-component="DetailLayout"]',
    '[data-component="WebContentWarning"]',
    'ol>li>span:first-child',
    'ul>li>span:first-child',
    '[data-component="NewsTicker"]',
    '[data-component="StickyHeader"]',
    ':not(aside)>[data-component="Sidebar"]'
  ].join(),
  // PL (App)
  'link[data-chunk="page.App"]': 'main:not([class*="u-"])'
};

const WHITESPACE_REMOVABLES = 'p';

function addDescriptorHints(storyEl, meta) {
  const storyElChildElements = [...storyEl.children];
  const storyElChildDescriptors = meta._articledetail.text.descriptor.children;

  storyElChildElements.forEach((childEl, index) => {
    childEl._descriptor = storyElChildDescriptors[index];
  });
}

function promoteToMain(storyEl, meta) {
  const existingMainEl = $(SELECTORS.MAIN);
  const mainEl = Main(Array.from(storyEl.childNodes), meta);

  mainEl.setAttribute('id', existingMainEl.getAttribute('id'));
  existingMainEl.removeAttribute('id');
  existingMainEl.removeAttribute('role');
  before(existingMainEl, mainEl);

  return mainEl;
}

export const reset = (storyEl, meta) => {
  const { isDarkMode, theme } = meta;

  // Apply minimum-scale=1 to viewport meta
  document
    .querySelector('meta[name="viewport"]')
    .setAttribute('content', 'width=device-width, initial-scale=1, minimum-scale=1');

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
  Object.keys(TEMPLATE_REMOVABLES).forEach(templateBodySelector => {
    if ($(templateBodySelector)) {
      detachAll($$(TEMPLATE_REMOVABLES[templateBodySelector]));
    }
  });

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

      before(el.nextElementSibling, pEl);
      append(pEl, el);
    }
  });

  // Treat WYSIWYG teaser embeds as nested richtext content
  $$(SELECTORS.WYSIWYG_EMBED, mainEl).forEach(el => {
    el.className = `u-richtext${isDarkMode ? '-invert' : ''}`;
  });

  // Clean up Presentation Layer components
  $$(
    [
      '[data-component="ContentLink"]',
      '[data-component="Heading"]',
      '[data-component="Link"]',
      '[data-component="List"]',
      '[data-component="ListItem"]',
      'p'
    ].join(),
    mainEl
  ).forEach(el => {
    el.removeAttribute('class');
    el.removeAttribute('data-component');
  });

  return mainEl;
};
