import debounce from 'debounce';
import { IS_PROBABLY_RESISTING_FINGERPRINTING } from '../constants';

// Preferably use a "millisecond budget", falling back
// to a "ticks budget" if we can reasonably assume that
// the current browser is restricting time measurement
// accuracy to 100ms (to combat user fingerprinting)
const BUDGETED_MILLISECONDS_PER_PERIOD = 12;
const BUDGETED_TICKS_PER_PERIOD = 24;
const budget = IS_PROBABLY_RESISTING_FINGERPRINTING
  ? {
      reset() {
        this.ticks = 0;
      },
      measure() {
        return this.ticks++ <= BUDGETED_TICKS_PER_PERIOD;
      }
    }
  : {
      reset() {
        this.ms = performance.now();
      },
      measure() {
        return performance.now() - this.ms <= BUDGETED_MILLISECONDS_PER_PERIOD;
      }
    };

const subscribers = new Map();
const queue = [];
let icb = null; // initial containing block
let hasStarted;
let isFlushing;

function flush() {
  if (queue.length === 0) {
    return (isFlushing = false);
  }

  isFlushing = true;
  budget.reset();

  while (queue.length > 0 && budget.measure()) {
    const next = queue.shift();

    next[0].apply(null, next[1]);
  }

  if (queue.length > 0) {
    return requestAnimationFrame(flush);
  }

  isFlushing = false;
}

export const enqueue = (task, ...params) => {
  if (hasStarted && !isFlushing) {
    requestAnimationFrame(flush);
  }

  queue.push([task, params]);
};

function notifySubscribers(hasChanged) {
  // `window.innerHeight` can change on mobile browser during scrolling because
  // the UI can grow/shrink. This affects the height of fixed items, not those
  // bound by the initial containing block (which `icb` measures). For this
  // reason, we always take a `fixedHeight` measurement before notifying
  // subscribers, rather than each of them having to read `window.innerHeight`.
  const client = Object.assign({ hasChanged, fixedHeight: window.innerHeight }, icb);

  subscribers.forEach((shouldIgnoreUnchangedClients, subscriber) => {
    if (hasChanged || !shouldIgnoreUnchangedClients) {
      enqueue(subscriber, client);
    }
  });
}

function onScroll() {
  if (queue.length === 0) {
    enqueue(notifySubscribers, false);
  }
}

function setCSSCustomProperties() {
  document.documentElement.style.setProperty('--scrollbar-width', `${window.innerWidth - icb.width}px`);
  document.documentElement.style.setProperty('--vw-ratio-16x9', `${Math.floor((icb.width / 16) * 9)}px`);
}

function onClientInvalidated(event) {
  let nextICB;

  if (event && queue.length !== 0) {
    return;
  }

  if (icb === null || event) {
    nextICB = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight
    };

    if (icb === null || nextICB.width !== icb.width || nextICB.height !== icb.height) {
      icb = nextICB;
    }
  }

  const hasChanged = nextICB && icb === nextICB;

  enqueue(notifySubscribers, hasChanged);

  if (hasChanged) {
    window.requestIdleCallback(setCSSCustomProperties);
  }
}

const onClientInvalidated_debounced = debounce(onClientInvalidated, 50);

const onClientInvalidatedTasks = [onClientInvalidated, onClientInvalidated_debounced];

export const invalidateClient = () => {
  const [firstQueuedTask] = queue[0] || [];

  // Try to avoid queueing more than one onClientInvalidated task
  if (!firstQueuedTask || onClientInvalidatedTasks.indexOf(firstQueuedTask) === -1) {
    enqueue(onClientInvalidated, true);
  }
};

export const start = () => {
  if (hasStarted) {
    return;
  }

  hasStarted = true;
  window.addEventListener('scroll', onScroll, false);
  window.addEventListener('resize', onClientInvalidated_debounced, false);
  window.addEventListener('orientationchange', onClientInvalidated_debounced, false);
  invalidateClient();
};

export const subscribe = (subscriber, shouldIgnoreUnchangedClients) => {
  if (typeof subscriber !== 'function') {
    return;
  }

  subscribers.set(subscriber, !!shouldIgnoreUnchangedClients);

  if (hasStarted) {
    invalidateClient();
  }
};

export const unsubscribe = subscriber => {
  return subscribers.delete(subscriber);
};
