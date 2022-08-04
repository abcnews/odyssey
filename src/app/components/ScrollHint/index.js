import html from 'nanohtml';
import { enqueue, subscribe, unsubscribe } from '../../scheduler';
import { detach } from '../../utils/dom';
import './index.scss';

let scrollHintEl = null;

const ScrollHint = () => {
  // We only ever want one instance
  if (scrollHintEl === null) {
    scrollHintEl = html`<div class="ScrollHint" role="presentation"></div>`;

    scrollHintEl.addEventListener('click', () => {
      window.scrollTo({
        behavior: 'smooth',
        top: (window.innerHeight / 4) * 3
      });
    });

    subscribe(_checkIfScrollHintNeedsToBeRemoved);
  }

  return scrollHintEl;
};

export default ScrollHint;

function _checkIfScrollHintNeedsToBeRemoved() {
  if (scrollHintEl == null || window.scrollY < 200) {
    return;
  }

  enqueue(function _removeScrollHintEl() {
    scrollHintEl.classList.add('leaving');
    setTimeout(() => {
      unsubscribe(_checkIfScrollHintNeedsToBeRemoved);
      detach(scrollHintEl);
      scrollHintEl = null;
    }, 500);
  });
}

export const transformMarker = marker => {
  marker.substituteWith(ScrollHint());
};
