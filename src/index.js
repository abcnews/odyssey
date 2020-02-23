require('./fonts.scss');
require('./keyframes.scss');
require('./app/components/utilities/index.scss');
require('./polyfills');

const app = require('./app');
const { IS_PL } = require('./constants');

if (IS_PL) {
  if (window.articleHydrated) {
    app.decoyed();
  } else {
    window.addEventListener('articleHydrated', app.decoyed);
  }
} else if (document.readyState !== 'loading') {
  app();
} else {
  document.addEventListener('DOMContentLoaded', app);
}
