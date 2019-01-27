// External
const html = require('bel');

// Ours
const { enqueue, subscribe } = require('../../scheduler');
const { detach } = require('../../utils/dom');
require('./index.scss');

let scrollHintEl = null;

function ScrollHint() {
  // We only ever want one instance
  if (scrollHintEl === null) {
    scrollHintEl = html`
      <div class="ScrollHint" role="presentation"></div>
    `;

    scrollHintEl.addEventListener('click', () => {
      window.scrollTo({
        behavior: 'smooth',
        top: (window.innerHeight / 4) * 3
      });
    });
  }

  return scrollHintEl;
}

subscribe(function _checkIfScrollHintNeedsToBeRemoved() {
  if (scrollHintEl == null || window.scrollY < 200) {
    return;
  }

  enqueue(function _removeScrollHintEl() {
    scrollHintEl.classList.add('leaving');
    setTimeout(() => {
      detach(scrollHintEl);
      scrollHintEl = null;
    }, 500);
  });
});

function transformMarker(marker) {
  marker.substituteWith(ScrollHint());
}

module.exports = ScrollHint;
module.exports.transformMarker = transformMarker;
