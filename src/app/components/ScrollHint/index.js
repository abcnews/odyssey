// External
import html from 'bel';

// Ours
import { enqueue, subscribe } from '../../scheduler';
import { detach } from '../../utils/dom';
import './index.scss';

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
  if (scrollHintEl === null || window.scrollY < 200) {
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

export function transformMarker(marker) {
  marker.substituteWith(ScrollHint());
}

export default ScrollHint;
