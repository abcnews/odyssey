require('./fonts.scss');
require('./keyframes.scss');
require('./app/components/utilities/index.scss');
require('./polyfills');

const app = require('./app');
const { IS_PL } = require('./constants');

if (IS_PL) {
  if (document.querySelector('[data-component="Decoy"]')) {
    app();
  } else {
    window.addEventListener('articleHydrated', app);
  }
} else {
  app();
}
