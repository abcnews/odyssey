// Ours
const {SELECTORS} = require('../constants');
const {after, before, detachAll, getSections, isElement, select} = require('../utils');
const Header = require('./components/Header');
const Nav = require('./components/Nav');
const {getMeta} = require('./meta');
const reset = require('./reset');

function app(done) {
  const meta = getMeta(); // Must happen before the story reset
  const storyEl = reset(select(SELECTORS.STORY));

  after(select(SELECTORS.GLOBAL_NAV), Nav({shareLinks: meta.shareLinks}));

  getSections([
    'header',
    'pull'
  ]).forEach(section => {
    switch (section.name) {
      case 'header':
        // console.log('header', section);
        Header.transformSection(section, meta);
        break;
      case 'pull':
        // console.log('pull', section);
        break;
      default:
        break;
    }
  });

  if (typeof done === 'function') {
    done();
  }
};

module.exports = app;
