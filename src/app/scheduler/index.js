// External
const raf = require('raf');

// Ours
const {REM} = require('../../constants');

const now = window.performance ? performance.now.bind(performance) : Date.now;

const BUDGETED_MILLISECONDS_PER_FRAME = 12;

const subscribers = [];
const queue = [];
let client = null
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
  const state = Object.assign({hasChanged}, client);
  
  subscribers.forEach((subscriber, index) => enqueue(subscriber.bind(null, state)));
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

function invalidateClient() {
  enqueue(onResize.bind(null, null, true));
}

function start() {
  if (hasStarted) {
    return;
  }

  hasStarted = true;
  window.addEventListener('scroll', onScroll, false);
  window.addEventListener('resize', onResize, false);
  window.addEventListener('orientationchange', onResize, false);
  invalidateClient();
}

function subscribe(subscriber) {
  subscribers.push(subscriber);

  if (hasStarted) {
    invalidateClient();
  }
}

module.exports.enqueue = enqueue;
module.exports.invalidateClient = invalidateClient;
module.exports.start = start;
module.exports.subscribe = subscribe;
