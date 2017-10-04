// Ours
const { enqueue, subscribe } = require('../../scheduler');

const parallaxes = [];

subscribe(function _checkIfParallaxesPropertiesNeedToBeUpdated() {
  parallaxes.forEach(parallax => {
    const rect = parallax.el.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > rect.height) {
      return;
    }

    const top = Math.min(0, rect.top);
    const opacityExtent = parallax.nextEl ? parallax.nextEl.getBoundingClientRect().top - top : rect.height;
    const opacity = 1 + top / opacityExtent;
    const yOffset = -33.33 * (top / rect.height);

    if (opacity !== parallax.state.opacity) {
      enqueue(function _updateParallaxProperties() {
        parallax.el.style.opacity = opacity;
        parallax.el.style.transform = `translate3d(0, ${yOffset}%, 0)`;
      });
      parallax.state = { opacity, yOffset };
    }
  });
});

function activate(el) {
  if (parallaxes.filter(parallax => parallax.el === el).length > 0) {
    return;
  }

  parallaxes.push({
    el,
    nextEl: el.nextElementSibling,
    state: {}
  });
}

module.exports.activate = activate;
