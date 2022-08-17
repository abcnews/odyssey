import { TIERS, getTier } from '@abcnews/env-utils';

const SHOULD_ALWAYS_DEBUG = String(window.location.search).indexOf('debug=1') > -1;

const logs = [];

export const debug = (...args) => {
  logs.push(['debug', ...args]);

  if (getTier() === TIERS.PREVIEW || SHOULD_ALWAYS_DEBUG) {
    console.debug.apply(null, ['[Odyssey]', ...args]);
  }
};

export const debugWhen = (promise, ...args) => promise.then(() => debug(...args));

export const conditionalDebug = (condition, trueMsg, falseMsg) => {
  if (condition && trueMsg) {
    debug(trueMsg);
  } else if (!condition && falseMsg) {
    debug(falseMsg);
  }
};

export const replay = () => {
  for (let [method, ...args] of logs) {
    console[method].apply(null, ['[Odyssey] [replay]', ...args]);
  }
};
