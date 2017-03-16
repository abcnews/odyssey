// Ours
const {SELECTORS} = require('../constants');
const {after, before, detachAll, getPlaceholders, getSections, isElement, select, selectAll} = require('../utils');
const Header = require('./components/Header');
const Nav = require('./components/Nav');
const Share = require('./components/Share');
const UPull = require('./components/UPull');
const {getMeta} = require('./meta');
const reset = require('./reset');

function app(done) {
  const meta = getMeta(); // Must happen before the story reset
  const storyEl = reset(select(SELECTORS.STORY));

  after(select(SELECTORS.GLOBAL_NAV), Nav({shareLinks: meta.shareLinks}));

  getPlaceholders([
    'share',
  ]).forEach(placeholder => {
    switch (placeholder.name) {
      case 'share':
        Share.transformPlaceholder(placeholder, meta.shareLinks);
        break;
      default:
        break;
    }
  });

  getSections([
    'header',
    'pull'
  ]).forEach(section => {
    switch (section.name) {
      case 'header':
        Header.transformSection(section, meta);
        break;
      case 'pull':
        UPull.transformSection(section);
        break;
      default:
        break;
    }
  });

  // Nullify nested pulls (outer always wins)
  selectAll('[class*="u-pull"] [class*="u-pull"]')
  .forEach(el => el.className = el.className.replace(/u-pull(-\w+)?/, 'n-pull$1'));

  if (typeof done === 'function') {
    done();
  }
};

module.exports = app;
