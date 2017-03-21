// External
const html = require('bel');
const raf = require('raf');

// Ours
const {getData, subscribe} = require('../../hooks');
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
  let nextState = {};

  function updateNextState(data) {
    const rect = navEl.getBoundingClientRect();

    nextState = {
      scrollY: data.windowScrollY,
      top: rect.top,
      isFixed: rect.top <= 0
    };
  }

  function updateBarPosition() {
    if (nextState.isFixed !== state.isFixed) {
      navBarEl.classList[nextState.isFixed ? 'add' : 'remove']('is-fixed');

      if ('isFixed' in state && nextState.isFixed) {
        navBarEl.style.transitionDuration = '0s';
        navBarEl.style.transform = `translateY(${nextState.top}px)`;

        raf(() => {
          const listener = navBarEl.addEventListener('transitionend', () => {
            navBarEl.removeEventListener('transitionend', listener);
            navBarEl.style.transitionDuration = '';
          }, false);

          navBarEl.style.transitionDuration = '.25s';
          navBarEl.style.transform = '';
        });
      }
    }

    if (!nextState.isFixed || Math.abs(nextState.scrollY - state.scrollY) > 10) {
      navBarEl.classList[!nextState.isFixed || nextState.scrollY - state.scrollY < 0 ? 'add' : 'remove']('is-peeking');
    }

    state = nextState;
  }

  subscribe({
    onSize: updateNextState,
    onPan: updateNextState,
    onFrame: updateBarPosition
  });

  raf(() => {
    updateNextState(getData());
  });

  return navEl;
};
