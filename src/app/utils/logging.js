import { TIERS, getTier } from '@abcnews/env-utils';

const SHOULD_ALWAYS_DEBUG = String(window.location.search).indexOf('debug=1') > -1;

const logs = [];

export const debug = (...args) => {
  logs.push(['debug', performance.now(), ...args]);

  if (getTier() === TIERS.PREVIEW || SHOULD_ALWAYS_DEBUG) {
    console.debug.apply(null, [`[Odyssey] (${Math.round(performance.now()) / 1000}s)`, ...args]);
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
  for (let [method, timestamp, ...args] of logs) {
    console[method].apply(null, ['[Odyssey] [replay] (' + Math.round(timestamp) / 1000 + 's)', ...args]);
  }
};
