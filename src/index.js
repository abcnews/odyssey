// Polyfills
require('@babel/polyfill');
require('objectFitPolyfill');
require('./polyfills');

// Global styles
require('./fonts.scss');
require('./keyframes.scss');
require('./app/components/utilities/index.scss');

// App
require('./app')();
