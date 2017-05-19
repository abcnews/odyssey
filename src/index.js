const isAMD = typeof define === 'function' && define.amd;

require('./polyfills');

// External
const domready = require('domready');
const objectFitImages = require('object-fit-images');
const picturefill = require('picturefill');
if (isAMD) { define._amd = define.amd; delete define.amd; }
const fastclick = require('fastclick');
if (isAMD) { define.amd = define._amd; delete define._amd; }

// Local
const app = require('./app');

function init() {
  app(() => {
    fastclick(document.body);
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
