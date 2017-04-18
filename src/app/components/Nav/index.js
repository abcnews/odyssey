// External
const html = require('bel');

// Ours
const {subscribe} = require('../../loop');
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

  let previousState = {};
  let state = {};

  function measure() {
    state = {
      top: navEl.getBoundingClientRect().top
    };
  }

  function mutate() {
    const wasFixed = previousState.top <= 0;
    const isFixed = state.top <= 0;
    const topDiff = state.top - previousState.top;

    if (wasFixed !== isFixed) {
      navBarEl.classList[isFixed ? 'add' : 'remove']('is-fixed');
    }

    if (!isFixed || Math.abs(topDiff) > 10) {
      navBarEl.classList[!isFixed || topDiff > 0 ? 'add' : 'remove']('is-peeking');
    }

    previousState = state;
  }

  subscribe({
    measure,
    mutate
  });

  return navEl;
};
