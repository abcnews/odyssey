// External
const raf = require('raf');

// Ours
const {NOEL} = require('../../constants');
const {getWindowScrollY} = require('../../utils');

const subscribers = {};
const nextId = -1;
const shouldIgnore = {};

function getData() {
  return {
    windowInnerHeight: window.innerHeight,
    windowScrollY: getWindowScrollY()
  };
}

function callHook(hook, data) {
  if (typeof hook === 'function') {
    hook(data);
  }
}

function callHooksImmediately(hookName, event) {
  const data = Object.assign(getData(), {event});

  Object.keys(subscribers)
  .forEach(id => {
    callHook(subscribers[id][hookName], data);
  });
}

function callHooks(hookName, event) {
  if (hookName === 'onFrame') {
    return callHooksImmediately(hookName);
  }

  if (shouldIgnore[hookName]) {
    return;
  }

  raf(() => {
    callHooksImmediately(hookName, event);
    shouldIgnore[hookName] = false;
  });

  shouldIgnore[hookName] = true;
}

function subscribe(hooks) {
  subscribers[++nextId] = hooks;

  return nextId;
}

function unsubscribe(id) {
  const subscriber = subscribers[id];

  delete subscribers[id];

  return subscriber;
}

const wheelEventName = 'onwheel' in NOEL ? 'wheel' :
  document.onmousewheel !== undefined ? 'mousewheel' :
  'DOMMouseScroll';
const callPanHooks = callHooks.bind(null, 'onPan');
const callSizeHooks = callHooks.bind(null, 'onSize');

window.addEventListener(wheelEventName, callPanHooks, {passive: true});
window.addEventListener('scroll', callPanHooks);
window.addEventListener('resize', callSizeHooks);
window.addEventListener('orientationchange', callSizeHooks);
window.addEventListener('load', callHooks.bind(null, 'onLoad'));
raf(function onFrame() {
  raf(onFrame);
  callHooksImmediately('onFrame');
});

module.exports = {
  subscribers,
  subscribe,
  callHooks,
  getData
};
