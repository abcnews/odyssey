require('./unveil');
require('./fonts.scss');
require('./keyframes.scss');
require('./app/components/utilities/index.scss');
require('./polyfills');
require('@abcnews/env-utils')
  .requestDOMPermit('body')
  .then(require('./app'));
