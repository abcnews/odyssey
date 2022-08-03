import React from 'react';
import ReactDOM from 'react-dom';
import Interactive from './Interactive';

const components = {
  Interactive
};

export const render = (componentName, props = {}, el) => {
  const Component = components[componentName];

  if (!Component || !el.parentElement) {
    return;
  }

  ReactDOM.render(<Component {...props} />, el);

  el.parentElement.insertBefore(el.firstChild, el);
  el.parentElement.removeChild(el);
};
