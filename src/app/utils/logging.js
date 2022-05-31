const { TIERS, getTier } = require('@abcnews/env-utils');

const SHOULD_ALWAYS_DEBUG = String(window.location.search).indexOf('debug=1') > -1;

export const debug = (...args) => {
  if (getTier() === TIERS.PREVIEW || SHOULD_ALWAYS_DEBUG) {
    console.debug.apply(null, ['[Odyssey]', ...args]);
  }
};

export const conditionalDebug = (condition, trueMsg, falseMsg) => {
  if (condition && trueMsg) {
    debug(trueMsg);
  } else if (!condition && falseMsg) {
    debug(falseMsg);
  }
};
