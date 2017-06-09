require('./polyfills');
require('objectFitPolyfill');

// External
const domready = require('domready');

// Local
const app = require('./app');

function init() {
  app(() => {
    if ('unveil' in window) {
      window.unveil();
    }
  });
}

if (document.querySelector('.init-interactive')) {
  init();
} else {
  domready(init);
}
