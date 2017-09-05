// Polyfills
require('./polyfills');
require('objectFitPolyfill');

// Global styles
require('./fonts.scss');
require('./keyframes.scss');
require('./app/components/utilities/index.scss');

// App
require('./app')();
