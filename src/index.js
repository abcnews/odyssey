import './unveil';
import './polyfills';
import './fonts.scss';
import './keyframes.scss';
import './app/components/utilities/index.scss';
import { proxy } from '@abcnews/dev-proxy';
import { GENERATIONS, getGeneration, requestDOMPermit } from '@abcnews/env-utils';
import { url2cmid } from '@abcnews/url2cmid';
import app from './app';
import { terminusFetch } from './app/utils/content';
import { debug } from './app/utils/logging';

// Provide a hint as early as possible that the Odyssey format will be driving
// this story, so that other interactives can opt to wait for Odyssey to load
// before trying to touch the DOM (mounts, decoys, etc.)
window.__IS_ODYSSEY_FORMAT__ = true;

proxy('odyssey').then(() => {
  // Don't run on IE or old-Edge, which we no longer support
  if (/* IE <= 9 */ (document.all && !window.atob) || /* IE >= 10 */ window.navigator.msPointerEnabled) {
    return;
  }

  // Once we've got:
  // 1. the article's terminus document, and
  // 2. permission to modify the DOM
  // ...we can run the run the app, using the terminus document to initialise the metadata that's used everywhere
  Promise.all([terminusFetch(url2cmid(window.location.href)), requestDOMPermit('body')]).then(([terminusDocument]) => {
    debug('Fetched Terminus article document and obtained DOM permit for "body"');
    app(terminusDocument);
  });
});
