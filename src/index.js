import './unveil';
import './polyfills';
import './keyframes.scss';
import './app/components/utilities/index.scss';
import { proxy } from '@abcnews/dev-proxy';
import { GENERATIONS, getGeneration, requestDOMPermit } from '@abcnews/env-utils';
import { url2cmid } from '@abcnews/url2cmid';
import app from './app';
import { terminusFetch } from './app/utils/content';
import { debug, debugWhen } from './app/utils/logging';

// Provide a hint as early as possible that the Odyssey format will be driving
// this story, so that other interactives can opt to wait for Odyssey to load
// before trying to touch the DOM (mounts, decoys, etc.)
window.__IS_ODYSSEY_FORMAT__ = true;

proxy('odyssey').then(() => {
  // Don't run on IE or old-Edge, which we no longer support
  if (/* IE <= 9 */ (document.all && !window.atob) || /* IE >= 10 */ window.navigator.msPointerEnabled) {
    return debug('Trident-based browsers are not supported');
  }

  // Don't run on non-PL website generations
  if (getGeneration() !== GENERATIONS.PL) {
    return debug('Non-Presentation Layer ABC websites are not supported');
  }

  // Once we've got:
  //   1. the article's terminus document, and
  const terminusFetchTask = terminusFetch(url2cmid(window.location.href));
  debugWhen(terminusFetchTask, 'Fetched Terminus article document');
  //   2. permission to modify the DOM
  const requestDOMPermitTask = requestDOMPermit('body');
  debugWhen(requestDOMPermitTask, 'Obtained DOM permit for "body"');
  // ...we can run the app, using the terminus document to initialise metadata
  Promise.all([terminusFetchTask, requestDOMPermitTask]).then(([terminusDocument]) => app(terminusDocument));
});
