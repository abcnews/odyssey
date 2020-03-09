// Ours
const { enqueue, subscribe } = require('../../scheduler');
require('./index.scss');

const ALLOWED_RATIOS = ['1x2', '9x16', '2x3', '3x4', '1x1', '4x3', '3x2', '16x9', '2x1'];
const DEFAULT_SIZE_RATIOS = {
  sm: '1x1',
  md: '3x2',
  lg: '16x9',
  xl: '16x9'
};
const SIZES = Object.keys(DEFAULT_SIZE_RATIOS);

const instances = [];
let lastKnownNumInstances;

function Sizer(sizeRatios) {
  const el = document.createElement('div');

  el.className = SIZES.reduce((memo, size) => {
    const ratio = sizeRatios[size];

    return `${memo} ${size}-${ratio && ALLOWED_RATIOS.indexOf(ratio) > -1 ? ratio : DEFAULT_SIZE_RATIOS[size]}`;
  }, 'Sizer');

  instances.push(el);
  setTimeout(() => {
    if (lastKnownNumInstances !== instances.length) {
      lastKnownNumInstances = instances.length;
      updateHeightSnapping();
    }
  });

  return el;
}

function updateHeightSnapping() {
  enqueue(() => {
    instances.forEach(el => {
      el.style.removeProperty('padding-top');
    });
  });

  enqueue(() => {
    instances.forEach(el => {
      const { width, height } = el.getBoundingClientRect();
      const snappedHeight = Math.round(height);

      if (height !== snappedHeight) {
        el.style.setProperty('padding-top', `${snappedHeight}px`);
      }
    });
  });
}

subscribe(function __updateHeightSnappingIfClientHasChanged(client) {
  if (client.hasChanged) {
    updateHeightSnapping();
  }
});

module.exports = Sizer;
