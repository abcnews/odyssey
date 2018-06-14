// External
const debounce = require('debounce');
const raf = require('raf');

// Ours
const { REM } = require('../../constants');

const now = window.performance ? performance.now.bind(performance) : Date.now;

const BUDGETED_MILLISECONDS_PER_FRAME = 12;

const subscribers = [];
const queue = [];
let client = null;
let hasStarted;

function flush() {
  if (queue.length === 0) {
    return;
  }

  const beginning = now();

  while (queue.length > 0 && now() - beginning < BUDGETED_MILLISECONDS_PER_FRAME) {
    queue.shift()();
  }

  if (queue.length > 0) {
    raf(flush);
  }
}

function enqueue(task) {
  if (hasStarted && queue.length === 0) {
    raf(flush);
  }

  queue.push(task);
}

function notifySubscribers(hasChanged) {
  const state = Object.assign({ hasChanged }, client);

  subscribers.forEach(subscriber => enqueue(subscriber.bind(null, state)));
}

function onScroll() {
  if (queue.length === 0) {
    enqueue(notifySubscribers, false);
  }
}

function setCSSCustomProperties() {
  document.documentElement.style.setProperty('--root-width', `${client.width / REM}rem`);
}

function onResize(event) {
  let nextClient;

  if (event && queue.length !== 0) {
    return;
  }

  if (client === null || event) {
    nextClient = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight
    };

    if (client === null || nextClient.width !== client.width || nextClient.h !== client.h) {
      client = nextClient;
    }
  }

  const hasChanged = nextClient && client === nextClient;

  enqueue(notifySubscribers.bind(null, hasChanged));

  if (hasChanged) {
    enqueue(setCSSCustomProperties);
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
