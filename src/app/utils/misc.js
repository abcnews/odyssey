import { SM_RATIO_PATTERN, MD_RATIO_PATTERN, LG_RATIO_PATTERN, XL_RATIO_PATTERN } from '../constants';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const twoDigits = number => {
  return `${number < 10 ? '0' : ''}${number}`;
};

export const formattedDate = date => {
  const hours = date.getHours();
  const hoursModTwelve = hours % 12;
  const minutes = date.getMinutes();

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${
    hoursModTwelve === 0 ? 12 : hoursModTwelve
  }:${minutes < 10 ? '0' : ''}${minutes}${hours < 12 ? 'a' : 'p'}m`;
};

export const flatten = lists => {
  return lists.reduce((acc, list) => {
    return acc.concat(list);
  }, []);
};

/** @typedef {{sm?: string, md?: string, lg?: string, xl?: string}} Ratios */

/**
 * Extract ratios from a config string.
 * @param {string} str A config string
 * @returns {Ratios}
 */
export const getRatios = str => {
  const [, sm] = str.match(SM_RATIO_PATTERN) || [];
  const [, md] = str.match(MD_RATIO_PATTERN) || [];
  const [, lg] = str.match(LG_RATIO_PATTERN) || [];
  const [, xl] = str.match(XL_RATIO_PATTERN) || [];

  return { sm, md, lg, xl };
};

export const dePx = px => {
  return +px.replace('px', '');
};

export const proximityCheck = (rect, client, range = 0) => {
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
};

export const whenKeyIn = (keys, fn) => {
  return function (event) {
    if (event.target === this && keys.indexOf(event.keyCode) > -1) {
      fn(event);
    }
  };
};

export const clampNumber = (value, min, max) => {
  return Math.max(min, Math.min(value, max));
};

export const isDefined = val => {
  return typeof val !== 'undefined' && val !== null;
};
