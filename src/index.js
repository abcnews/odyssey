require('./unveil');
require('./fonts.scss');
require('./keyframes.scss');
require('./app/components/utilities/index.scss');
require('./polyfills');
const { GENERATIONS, getGeneration, requestDOMPermit } = require('@abcnews/env-utils');

// When this runs as Associated JS, rather than init-interactive,
// we still need to let Phase 1 know (somehow) that we intend to
// takeover the article and implement our own audio/video players
if (getGeneration() === GENERATIONS.P1) {
  const implementsEl = document.createElement('meta');

  implementsEl.className = 'init-interactive';
  implementsEl.setAttribute('data-implements', 'article,audio,video');
  document.head.appendChild(implementsEl);
}

// Once we know we're allowed to modify the DOM, run the app
requestDOMPermit('body').then(require('./app'));
