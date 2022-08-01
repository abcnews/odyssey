import { SELECTORS } from '../../constants';
import Main from '../components/Main';
import { $, $$, append, before, detach, detachAll } from '../utils/dom';
import { trim } from '../utils/misc';
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
    '[data-component="Sidebar"]:first-child'
  ].join(),
  // PL (App)
  'link[data-chunk="page.App"]': 'main:not([class*="u-"])'
};

const WHITESPACE_REMOVABLES = 'p';

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

  storyEl = promoteToMain(storyEl, meta);

  // Remove elements we don't need
  Object.keys(TEMPLATE_REMOVABLES).forEach(templateBodySelector => {
    if ($(templateBodySelector)) {
      detachAll($$(TEMPLATE_REMOVABLES[templateBodySelector]));
    }
  });

  // Remove elements that don't contain any text
  $$(WHITESPACE_REMOVABLES, storyEl).forEach(el => {
    if (trim(el.textContent).length === 0) {
      detach(el);
    }
  });

  // Fix PL top-level links that aren't inside paragraphs.
  Array.from(storyEl.children).forEach(el => {
    if (el.tagName === 'A' && el.hasAttribute('href')) {
      const pEl = document.createElement('p');

      before(el.nextElementSibling, pEl);
      append(pEl, el);
    }
  });

  // Treat WYSIWYG teaser embeds as nested richtext content
  $$(SELECTORS.WYSIWYG_EMBED, storyEl).forEach(el => {
    el.className = `u-richtext${isDarkMode ? '-invert' : ''}`;
  });

  // Clean up Presentation Layer components
  $$(
    [
      '[data-component="ContentLink"]',
      '[data-component="Heading"]',
      '[data-component="List"]',
      '[data-component="ListItem"]',
      'p'
    ].join(),
    storyEl
  ).forEach(el => {
    el.removeAttribute('class');
    el.removeAttribute('data-component');
  });

  return storyEl;
};
