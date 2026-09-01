import { proxy } from '@abcnews/dev-proxy';
import { GENERATIONS, getGeneration, requestDOMPermit } from '@abcnews/env-utils';
import { url2cmid } from '@abcnews/url2cmid';
import { fetchDocument } from './app/utils/content';
import { debug, debugWhen } from './app/utils/logging';
import './polyfills';
import './unveil';
import { unsupported } from './support';

// Do this as early as possible.
if (unsupported()) {
  window.unveil && window.unveil();
  // Odyssey uses critical features not supported by this browser, give up here.
  return debug('Odyssey not supported in this browser');
}

// Provide a hint as early as possible that the Odyssey format will be driving
// this story, so that other interactives can opt to wait for Odyssey to load
// before trying to touch the DOM (mounts, decoys, etc.)
window.__IS_ODYSSEY_FORMAT__ = true;

proxy('odyssey').then(() => {
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
    return requestDOMPermit('body');
  });
  debug('Requested "body" DOM permit');
  debugWhen(obtainBodyDOMPermitTask, 'Obtained "body" DOM permit');

  // ...we can run the app, using the terminus document to initialise metadata
  Promise.all([importAppModuleTask, fetchArticleDocumentTask, obtainBodyDOMPermitTask]).then(
    ([appModule, terminusDocument, domPermit]) => {
      appModule.default(terminusDocument);

      // Let PL know we're ready to load "islands" back in, such as expandable cards.
      if (domPermit && typeof domPermit.onRender === 'function') {
        domPermit.onRender();
      }
    }
  );
});
