// External
const raf = require('raf');

// Ours
const {NOEL, REM} = require('../../constants');

const SUPPORTS_CSS_CUSTOM_PROPS = 'CSS' in window && 'supports' in CSS && CSS.supports('(--foo: bar)');

const nextFrameQueue = [];
const subscribers = {};

let wasMeasured = false;
let nextId = -1;
let previousViewport = measureViewport();
let viewport = previousViewport;
let previousCustomProps = {};
let customProps = previousCustomProps;

const setCustomProp = document.documentElement.style.setProperty.bind(document.documentElement.style);

function measureViewport() {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

function measureCustomProps() {
  return SUPPORTS_CSS_CUSTOM_PROPS ? {
    // '--screen-height': `${window.screen.height / REM}rem`,
    // '--screen-width': `${window.screen.width / REM}rem`,
    // '--root-height': `${document.documentElement.clientHeight / REM}rem`,
    '--root-width': `${document.documentElement.clientWidth / REM}rem`
  } : {};
}

function setCustomProps() {
  Object.keys(customProps).forEach(prop => {
    if (customProps[prop] !== previousCustomProps[prop]) {
      setCustomProp(prop, customProps[prop]);
    }
  });

  previousCustomProps = customProps;
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

  const nextViewport = measureViewport();

  if (nextViewport.width === previousViewport.width &&
      nextViewport.height === previousViewport.height) {
    return;
  }

  wasMeasured = true;
  viewport = nextViewport;
  customProps = measureCustomProps();
  callSubscribersHooks('measure', viewport);
}

function frame() {
  if (nextFrameQueue.length > 0) {
    flushNextFrameQueue();
  }

  if (wasMeasured) {
    wasMeasured = false;
    previousViewport = viewport;
    setCustomProps();
    callSubscribersHooks('mutate');
  }

  raf(frame);
}

function start() {
  // Bind event listeners that trigger measurements
  window.addEventListener('scroll', onPosition);
  window.addEventListener('resize', onSize);
  window.addEventListener('orientationchange', onSize);

  // Measure & set initial custom props, then kick off the mutation loop
  raf(() => {
    customProps = measureCustomProps();
    setCustomProps();
    frame();
  });
}

module.exports = {
  start,
  nextFrame,
  subscribe
};
