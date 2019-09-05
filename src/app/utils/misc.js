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
  smartquotes
};
