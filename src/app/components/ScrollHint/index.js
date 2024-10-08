// @ts-check

import html from 'nanohtml';
import { enqueue, subscribe, unsubscribe } from '../../scheduler';
import { detach } from '../../utils/dom';
import { getMeta } from '../../meta';
import styles from './index.lazy.scss';

let scrollHintEl = null;

/**
 * Get a scroll hint element.
 *
 * @returns {HTMLDivElement}
 */
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

  styles.use();

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

/**
 * Transform the scroll hint marker
 * @param {import('src/app/utils/mounts').Marker} marker
 */
export const transformMarker = marker => {
  // This component no longer exists as of the Future News redesign.
  // We can remove all traces of it once the old site has been turned off for good.
  if (marker.substituteWith && !getMeta().isFuture) {
    marker.substituteWith(ScrollHint());
  } else {
    detach(marker.node);
  }
};
