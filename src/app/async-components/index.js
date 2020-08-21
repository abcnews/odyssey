// External
// const { AppContextProvider } = require('@abcaustralia/nucleus/es6/AppContext/AppContext').default;
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
  if (!el.parentElement) {
    return;
  }

  // ReactDOM.render(
  //   <App brand="news" externalIconFile={false} flexContainer={false}>
  //     {(shouldIncludeIcons = shouldIncludeIcons && <Icons />)}
  //     {React.createElement(components[componentName], props)}
  //   </App>,
  //   el
  // );

  ReactDOM.render(
    <div data-odyssey-async-componet-root>
      {(shouldIncludeIcons = shouldIncludeIcons && <Icons />)}
      {React.createElement(components[componentName], props)}
    </div>,
    el
  );

  el.parentElement.insertBefore(el.firstChild, el);
  el.parentElement.removeChild(el);
};
