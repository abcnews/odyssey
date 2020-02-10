// External
const debounce = require('debounce');

const now = window.performance ? performance.now.bind(performance) : Date.now;

const BUDGETED_MILLISECONDS_PER_FRAME = 12;

const subscribers = [];
const queue = [];
let icb = null; // initial containing block
let hasStarted;
let isFlushing;

function flush() {
  if (queue.length === 0) {
    return (isFlushing = false);
  }

  isFlushing = true;

  const beginning = now();

  while (queue.length > 0 && now() - beginning < BUDGETED_MILLISECONDS_PER_FRAME) {
    queue.shift()();
  }

  if (queue.length > 0) {
    return requestAnimationFrame(flush);
  }

  isFlushing = false;
}

function enqueue(task) {
  if (hasStarted && !isFlushing) {
    requestAnimationFrame(flush);
  }

  queue.push(task);
}

function notifySubscribers(hasChanged) {
  // `window.innerHeight` can change on mobile browser during scrolling because
  // the UI can grow/shrink. This affects the height of fixed items, not those
  // bound by the initial containing block (which `icb` measures). For this
  // reason, we always take a `fixedHeight` measurement before notifying
  // subscribers, rather than each of them having to read `window.innerHeight`.
  const client = Object.assign({ hasChanged, fixedHeight: window.innerHeight }, icb);

  subscribers.forEach(subscriber => enqueue(subscriber.bind(null, client)));
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

function onResize(event) {
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

  enqueue(notifySubscribers.bind(null, hasChanged));

  if (hasChanged) {
    window.requestIdleCallback(setCSSCustomProperties);
  }
}

const onDebouncedResize = debounce(onResize, 50);

function invalidateClient() {
  enqueue(onResize.bind(null, true));
}

function start() {
  if (hasStarted) {
    return;
  }

  hasStarted = true;
  window.addEventListener('scroll', onScroll, false);
  window.addEventListener('resize', onDebouncedResize, false);
  window.addEventListener('orientationchange', onDebouncedResize, false);
  invalidateClient();
}

function subscribe(subscriber) {
  if (typeof subscriber !== 'function') {
    return;
  }

  subscribers.push(subscriber);

  if (hasStarted) {
    invalidateClient();
  }
}

function unsubscribe(subscriber) {
  return subscribers.splice(subscribers.indexOf(subscriber), 1);
}

module.exports.enqueue = enqueue;
module.exports.invalidateClient = invalidateClient;
module.exports.start = start;
module.exports.subscribe = subscribe;
module.exports.unsubscribe = unsubscribe;
