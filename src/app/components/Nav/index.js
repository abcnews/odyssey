// External
const html = require('bel');

// Ours
const {enqueue, subscribe} = require('../../scheduler');
const ShareLinks = require('../ShareLinks');

module.exports = function Nav({homeHref = '/news/', shareLinks}) {
  const navBarEl = html`
    <div class="Nav-bar">
      <a class="Nav-home" href="${homeHref}">ABC News</a>
      ${ShareLinks(shareLinks)}
    </div>
  `;

  const navEl = html`
    <div class="Nav">
      ${navBarEl}
    </div>
  `;

  let state = {};

  subscribe(function _checkIfNavBarPropertiesShouldBeUpdated() {
    const rect = navEl.getBoundingClientRect();
    const top = rect.top;
    const diff = top - state.top;
    const isFixed = top <= 0;

    if (isFixed !== state.isFixed || !isFixed || Math.abs(diff) > 10) {
      enqueue(function _updateNavBarProperties() {
        navBarEl.classList[isFixed ? 'add' : 'remove']('is-fixed');
        navBarEl.classList[!isFixed || diff > 0 ? 'add' : 'remove']('is-peeking');
      });

      state = {top, diff, isFixed};
    }
  });

  return navEl;
};
