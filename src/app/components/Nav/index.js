// External
const html = require('bel');

// Ours
const {enqueue, subscribe} = require('../../scheduler');
const ShareLinks = require('../ShareLinks');
require('./index.scss');

module.exports = function Nav({homeHref = '/news/', shareLinks}) {
  const navBarEl = html`
    <div class="Nav-bar">
      <a class="Nav-home" href="${homeHref}" aria-label="Return to the ABC News homepage">ABC News</a>
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
    const diff = state.top - top;
    const isAbove = top <= 0;

    if (
      isAbove !== state.isAbove ||
      isAbove && Math.abs(diff) > 10
    ) {
      enqueue(function _updateNavBarProperties() {
        navEl.classList[isAbove ? 'add' : 'remove']('is-above');
        navBarEl.classList[isAbove && diff > 0 ? 'add' : 'remove']('is-hiding');
      });

      state = {top, isAbove};
    }
  });

  return navEl;
};
