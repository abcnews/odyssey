// External
const App = require('@abcaustralia/dls-components/es6/App/App').default;
const React = require('react');
const ReactDOM = require('react-dom');

// Ours
const Icons = require('./Icons');
const Nav = require('./Nav');

const components = {
  Nav
};

let shouldIncludeIcons = true;

module.exports.render = (componentName, props = {}, el) => {
  ReactDOM.render(
    <App brand="news" externalIconFile={false} flexContainer={false}>
      {(shouldIncludeIcons = shouldIncludeIcons && <Icons />)}
      {React.createElement(components[componentName], props)}
    </App>,
    el
  );

  el.parentElement.insertBefore(el.firstChild, el);
  el.parentElement.removeChild(el);
};
