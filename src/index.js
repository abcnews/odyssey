require('./unveil');
require('./fonts.scss');
require('./keyframes.scss');
require('./app/components/utilities/index.scss');
require('./polyfills');
const { proxy } = require('@abcnews/dev-proxy');
const { GENERATIONS, getGeneration, requestDOMPermit } = require('@abcnews/env-utils');
const { url2cmid } = require('@abcnews/url2cmid');
const { terminusFetch } = require('./app/utils/content');

// Provide a hint as early as possible that the Odyssey format will be driving
// this story, so that other interactives can opt to wait for Odyssey to load
// before trying to touch the DOM (mounts, decoys, etc.)
window.__IS_ODYSSEY_FORMAT__ = true;

proxy('odyssey').then(() => {
  // When this runs as Associated JS, rather than init-interactive,
  // we still need to let Phase 1 know (somehow) that we intend to
  // takeover the article and implement our own audio/video players
  if (getGeneration() === GENERATIONS.P1) {
    const implementsEl = document.createElement('meta');

    implementsEl.className = 'init-interactive';
    implementsEl.setAttribute('data-implements', 'article,audio,image,video');
    document.head.appendChild(implementsEl);
  }

  // Once we've got:
  // 1. the article's terminus document, and
  // 2. permission to modify the DOM
  // ...we can run the run the app, using the terminus document to initialise the metadata that's used everywhere
  Promise.all([terminusFetch(url2cmid(window.location.href)), requestDOMPermit('body')]).then(([terminusDocument]) =>
    require('./app')(terminusDocument)
  );
});
