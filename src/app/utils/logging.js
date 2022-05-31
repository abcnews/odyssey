const { TIERS, getTier } = require('@abcnews/env-utils');

const SHOULD_ALWAYS_DEBUG = String(window.location.search).indexOf('debug=1') > -1;

export const debug = (...args) => {
  if (getTier() === TIERS.PREVIEW || SHOULD_ALWAYS_DEBUG) {
    console.debug.apply(null, ['[Odyssey]', ...args]);
  }
};
