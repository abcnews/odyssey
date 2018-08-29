const { IS_PREVIEW, QUERY } = require('./constants');

let shouldLoadNow = true;

if (IS_PREVIEW && QUERY['odyssey']) {
  const odyssey = QUERY['odyssey'].split('-');
  const scriptUrl = `//${odyssey[0]}.aus.aunty.abc.net.au:${odyssey[1] || 8000}/index.js`;

  if (!document.querySelector(`script[src="${scriptUrl}"]`)) {
    shouldLoadNow = false;

    const script = document.createElement('script');
    script.src = scriptUrl;
    document.querySelector('head').appendChild(script);
  }
}

if (shouldLoadNow) {
  // Polyfills
  require('./polyfills');
  require('objectFitPolyfill');

  // Global styles
  require('./fonts.scss');
  require('./keyframes.scss');
  require('./app/components/utilities/index.scss');

  // App
  require('./app')();
}
