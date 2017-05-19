// External
const raf = require('raf');

// Ours
const {NOEL} = require('../../constants');

const nextFrameQueue = [];
const nextId = -1;
const wasMeasured = false;
const subscribers = {};

function getViewport() {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

function subscribe(hooks) {
  subscribers[++nextId] = hooks;

  // Measure in the next frame because component may not yet be in the DOM
  if (hooks.measure) {
    nextFrame(() => {
      hooks.measure(viewport);

      // ...then mutate the following frame
      if (hooks.mutate) {
        nextFrame(() => {
          hooks.mutate();
        });
      }
    });
  }

  return nextId;
}

function nextFrame(hook) {
  nextFrameQueue.push(hook);
}

function flushNextFrameQueue() {
  while (nextFrameQueue.length > 0) {
    nextFrameQueue.shift()();
  }
}

function callHook(hook, viewport) {
  if (typeof hook === 'function') {
    hook(viewport);
  }
}

function callSubscribersHooks(hookLabel, viewport) {
  Object.keys(subscribers).forEach(id => {
    callHook(subscribers[id][hookLabel], viewport);
  });
}

let previousViewport = getViewport();
let viewport = previousViewport;

function onPosition() {
  if (wasMeasured) {
    return;
  }

  wasMeasured = true;

  callSubscribersHooks('measure', viewport);
}

function onSize() {
  if (wasMeasured) {
    return;
  }

  setCSSCustomProps();

  const nextViewport = getViewport();

  if (nextViewport.width === previousViewport.width &&
      nextViewport.height === previousViewport.height) {
    return;
  }

  wasMeasured = true;
  viewport = nextViewport;

  callSubscribersHooks('measure', viewport);
}

function frame() {
  if (nextFrameQueue.length > 0) {
    flushNextFrameQueue();
  }

  if (wasMeasured) {
    wasMeasured = false;
    previousViewport = viewport;

    callSubscribersHooks('mutate');
  }

  raf(frame);
}

function setCSSCustomProps() {
  document.documentElement.style.setProperty('--screen-width', `${window.screen.width}px`);
  document.documentElement.style.setProperty('--screen-height', `${window.screen.height}px`);
}

function start() {
  window.addEventListener('scroll', onPosition);
  window.addEventListener('resize', onSize);
  window.addEventListener('orientationchange', onSize);

  setCSSCustomProps();

  // Main app clock
  raf(frame);
}

module.exports = {
  start,
  nextFrame,
  subscribe
};
