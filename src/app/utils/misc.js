const smartquotes = require('./smartquotes');
const {
  HYPHEN,
  NEWLINE,
  SM_RATIO_PATTERN,
  MD_RATIO_PATTERN,
  LG_RATIO_PATTERN,
  XL_RATIO_PATTERN
} = require('../../constants');

const SLUG_ALLOWED_PATTERN = /[^\w\s\-\_]/g;
const SLUG_REPLACE_PATTERN = /[-\s]+/g;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TRIM_PATTERN = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

function returnFalse() {
  return false;
}

function trim(str) {
  return str.replace(TRIM_PATTERN, '');
}

function twoDigits(number) {
  return `${number < 10 ? '0' : ''}${number}`;
}

function formattedDate(date) {
  const hours = date.getHours();
  const minutes = date.getHours();

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hours}:${
    minutes < 10 ? '0' : ''
  }${minutes}${hours < 12 ? 'a' : 'p'}m`;
}

function flatten(lists) {
  return lists.reduce((acc, list) => {
    return acc.concat(list);
  }, []);
}

function literalList(str, { skipTrim, allowEmpty } = {}) {
  return str
    .split(NEWLINE)
    .map(x => (skipTrim ? x : x.trim()))
    .filter(x => (allowEmpty ? x : x.length))
    .join();
}

function getRatios(str) {
  const [, sm] = str.match(SM_RATIO_PATTERN) || [];
  const [, md] = str.match(MD_RATIO_PATTERN) || [];
  const [, lg] = str.match(LG_RATIO_PATTERN) || [];
  const [, xl] = str.match(XL_RATIO_PATTERN) || [];

  return { sm, md, lg, xl };
}

function dePx(px) {
  return +px.replace('px', '');
}

function proximityCheck(rect, client, range = 0) {
  // `rect` is #getBoundingClientRect of element
  // `client` is visible width & height dimensions
  // `range` is amount extend (or reduce) the perimeter as a multiple of each dimension

  return (
    // Has size
    rect.width > 0 &&
    rect.height > 0 &&
    // Fully covering client on Y-axis
    ((rect.top <= 0 && rect.bottom >= client.height) ||
      // Top within load range
      (rect.top >= 0 && rect.top <= client.height * (1 + range)) ||
      // Bottom within load range
      (rect.bottom >= client.height * -range && rect.bottom <= client.height)) &&
    // Fully covering client on X-axis
    ((rect.left <= 0 && rect.right >= client.width) ||
      // Left within load range
      (rect.left >= 0 && rect.left <= client.width * (1 + range)) ||
      // Right within load range
      (rect.right >= client.width * -range && rect.right <= client.width))
  );
}

function whenKeyIn(keys, fn) {
  return function(event) {
    if (event.target === this && keys.indexOf(event.keyCode) > -1) {
      fn(event);
    }
  };
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

const ABSOLUTE_OR_RELATIVE = new Set(['absolute', 'relative']);
const FIXED_OR_STICKY = new Set(['fixed', 'sticky']);
const FLEX_OR_GRID = new Set(['flex', 'grid']);
const LAYOUT_OR_PAINT_OR_STRICT_OR_CONTENT = new Set(['layout', 'paint', 'strict', 'content']);
const INITIAL_VALUES_OF_PROPS = {
  opacity: '1',
  mixBlendMode: 'normal',
  transform: 'none',
  filter: 'none',
  perspective: 'none',
  clipPath: 'none',
  mask: 'none'
};
const PROPS_WITH_INITIAL_VALUES = Object.keys(INITIAL_VALUES_OF_PROPS);
const DASHED_PROPS_WITH_INITIAL_VALUES = new Set(
  PROPS_WITH_INITIAL_VALUES.map(prop => prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase())
);

function elementLayerPixels(el) {
  return el.clientWidth * el.clientHeight;
}

function stackingContextReport() {
  const allEls = [...document.querySelectorAll('*')];
  const stackingContextEls = allEls.filter(el => {
    const style = window.getComputedStyle(el);
    const parentStyle = el.parentElement && window.getComputedStyle(el.parentElement);
    const zIndexIsAuto = style.zIndex === 'auto';
    const willChange = style.willChange.split(',');

    // Rules: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Positioning/Understanding_z_index/The_stacking_context#The_stacking_context
    return (
      el === document.documentElement ||
      (ABSOLUTE_OR_RELATIVE.has(style.position) && !zIndexIsAuto) ||
      FIXED_OR_STICKY.has(style.position) ||
      (parentStyle && FLEX_OR_GRID.has(parentStyle.display) && !zIndexIsAuto) ||
      PROPS_WITH_INITIAL_VALUES.filter(prop => style[prop] !== INITIAL_VALUES_OF_PROPS[prop]).length > 0 ||
      style.isolation === 'isolate' ||
      style.webkitOverflowScrolling === 'touch' ||
      style.willChange.split(', ').filter(prop => DASHED_PROPS_WITH_INITIAL_VALUES.has(prop)).length > 0 ||
      LAYOUT_OR_PAINT_OR_STRICT_OR_CONTENT.has(style.contain)
    );
  });

  const { clientHeight, clientWidth } = document.documentElement;
  const intersectingStackingContextEls = stackingContextEls.filter(el => {
    const { top, right, bottom, left } = el.getBoundingClientRect();

    return top <= clientHeight && right >= 0 && bottom >= 0 && left <= clientWidth;
  });

  console.table({
    'Total elements': allEls.length,
    'Stacking contexts': stackingContextEls.length,
    'Stacking contexts overlapping viewport': intersectingStackingContextEls.length,
    'Pixels rendered across stacking contexts': stackingContextEls.reduce(
      (memo, el) => memo + elementLayerPixels(el),
      0
    ),
    'Pixels rendered across stacking contexts overlapping viewport': intersectingStackingContextEls.reduce(
      (memo, el) => memo + elementLayerPixels(el),
      0
    )
  });
}

module.exports = {
  returnFalse,
  trim,
  twoDigits,
  formattedDate,
  flatten,
  literalList,
  getRatios,
  dePx,
  proximityCheck,
  whenKeyIn,
  clampNumber,
  smartquotes,
  stackingContextReport
};
