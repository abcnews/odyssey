import { getMeta } from '../../meta';
import { enqueue, subscribe } from '../../scheduler';

const parallaxes = [];

export const activate = el => {
  if (parallaxes.find(parallax => parallax.el === el)) {
    return;
  }

  parallaxes.push({
    el,
    nextEl: el.nextElementSibling,
    state: {}
  });

  if (parallaxes.length === 1) {
    subscribe(_checkIfParallaxesPropertiesNeedToBeUpdated);
  }
};

function _checkIfParallaxesPropertiesNeedToBeUpdated() {
  parallaxes.forEach(parallax => {
    const rect = parallax.el.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > rect.height) {
      return;
    }

    const meta = getMeta();

    const top = Math.min(0, rect.top);
    const opacityExtent = parallax.nextEl ? parallax.nextEl.getBoundingClientRect().top - top : rect.height;
    const opacity = 1 + top / opacityExtent;
    const yOffset = -33.33 * (top / rect.height);

    if (opacity !== parallax.state.opacity) {
      enqueue(function _updateParallaxProperties() {
        if (!meta.isFuture) parallax.el.style.opacity = opacity;
        parallax.el.style.transform = `translate3d(0, ${yOffset}%, 0)`;
      });
      parallax.state = { opacity, yOffset };
    }
  });
}
