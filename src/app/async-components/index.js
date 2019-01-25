// External
import App from '@abcaustralia/dls-components/es6/App/App';
import React from 'react';
import ReactDOM from 'react-dom';

// Ours
import Icons from './Icons';
import Nav from './Nav';

const components = {
  Nav
};

let shouldIncludeIcons = true;

export const render = (componentName, props = {}, el) => {
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
