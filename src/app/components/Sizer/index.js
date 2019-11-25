// Ours
require('./index.scss');

const ALLOWED_RATIOS = ['3x4', '1x1', '4x3', '3x2', '16x9'];
const DEFAULT_SIZE_RATIOS = {
  sm: '1x1',
  md: '3x2',
  lg: '16x9',
  xl: '16x9'
};
const SIZES = Object.keys(DEFAULT_SIZE_RATIOS);

function Sizer(sizeRatios) {
  const el = document.createElement('div');

  el.className = SIZES.reduce((memo, size) => {
    const ratio = sizeRatios[size];

    return `${memo} ${size}-${ratio && ALLOWED_RATIOS.indexOf(ratio) > -1 ? ratio : DEFAULT_SIZE_RATIOS[size]}`;
  }, 'Sizer');

  return el;
}

module.exports = Sizer;
