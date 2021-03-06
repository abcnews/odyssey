// External
const { AppContext } = require('@abcaustralia/nucleus/es6/AppContext/AppContext');
const GlobalStyles = require('@abcaustralia/nucleus/es6/GlobalStyles/GlobalStyles').default;
const React = require('react');
const ReactDOM = require('react-dom');

// Ours
require('./root.css');
const Icons = require('./Icons');
const Nav = require('./Nav');

const components = {
  Nav
};

let shouldIncludeIcons = true;

module.exports.render = (componentName, props = {}, el) => {
  if (!el.parentElement) {
    return;
  }

  ReactDOM.render(
    <AppContext.Provider value={{ inlineIconSprite: true, staticPath: '/news-web/', typographyScale: 'compact' }}>
      <GlobalStyles>
        {(shouldIncludeIcons = shouldIncludeIcons && <Icons />)}
        {React.createElement(components[componentName], props)}
      </GlobalStyles>
    </AppContext.Provider>,
    el
  );

  el.parentElement.insertBefore(el.firstChild, el);
  el.parentElement.removeChild(el);
};
