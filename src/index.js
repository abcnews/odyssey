require('./polyfills');

// External
const domready = require('domready');
// const fastclick = require('fastclick');
const objectFitImages = require('object-fit-images');
const picturefill = require('picturefill');

// Local
const app = require('./app');

function init() {
  app(() => {
    // fastclick(document.body);
    picturefill();
    objectFitImages();

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
