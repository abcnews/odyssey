import { proxy } from '@abcnews/dev-proxy';
import { GENERATIONS, getGeneration, requestDOMPermit } from '@abcnews/env-utils';
import { url2cmid } from '@abcnews/url2cmid';
import { fetchDocument } from './app/utils/content';
import { debug, debugWhen } from './app/utils/logging';
import './polyfills';
import './unveil';

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

  // 1. the dynamically imported app module, and
  const importAppModuleTask = import(/* webpackChunkName: "app" */ './app');
  debugWhen(importAppModuleTask, 'Imported app module');

  // 2. the article's terminus document, and
  const fetchArticleDocumentTask = fetchDocument(url2cmid(window.location.href));
  debugWhen(fetchArticleDocumentTask, 'Fetched article document');

  // 3. permission to modify the DOM
  const obtainBodyDOMPermitTask = requestDOMPermit('body').catch(err => {
    // Try again, once.
    // It appears possible that sometimes this request is made before PL sets up the decoy request listener
    // See: NEWSWEB-3258
    debug('Attempting second request for "body" DOM permit');
    return requestDOMPermit('body');
  });
  debug('Requested "body" DOM permit');
  debugWhen(obtainBodyDOMPermitTask, 'Obtained "body" DOM permit');

  // ...we can run the app, using the terminus document to initialise metadata
  Promise.all([importAppModuleTask, fetchArticleDocumentTask, obtainBodyDOMPermitTask]).then(
    ([appModule, terminusDocument]) => appModule.default(terminusDocument)
  );
});
