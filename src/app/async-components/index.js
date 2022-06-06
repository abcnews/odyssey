// External
const { AppContextProvider } = require('@abcaustralia/nucleus/es6/AppContext/AppContext');
const { GlobalStyles } = require('@abcaustralia/nucleus/es6/GlobalStyles/GlobalStyles');
const React = require('react');
const ReactDOM = require('react-dom');

// Ours
require('./root.css');
const Icons = require('./Icons');
const Interactive = require('./Interactive');
const Nav = require('./Nav');

const components = {
  Interactive,
  Nav
};

let shouldIncludeIcons = true;

module.exports.render = (componentName, props = {}, el) => {
  const Component = components[componentName];

  if (!Component || !el.parentElement) {
    return;
  }

  ReactDOM.render(
    <AppContextProvider value={{ inlineIconSprite: true, staticPath: '/news-web/', typographyScale: 'compact' }}>
      <GlobalStyles>
        {shouldIncludeIcons ? (shouldIncludeIcons = false) || <Icons /> : null}
        <Component {...props} />
      </GlobalStyles>
    </AppContextProvider>,
    el
  );

  el.parentElement.insertBefore(el.firstChild, el);
  el.parentElement.removeChild(el);
};
