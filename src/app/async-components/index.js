import { AppContextProvider } from '@abcaustralia/nucleus/es6/AppContext/AppContext';
import { GlobalStyles } from '@abcaustralia/nucleus/es6/GlobalStyles/GlobalStyles';
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

  ReactDOM.render(
    <AppContextProvider value={{ inlineIconSprite: true, staticPath: '/news-web/', typographyScale: 'compact' }}>
      <GlobalStyles>
        <Component {...props} />
      </GlobalStyles>
    </AppContextProvider>,
    el
  );

  el.parentElement.insertBefore(el.firstChild, el);
  el.parentElement.removeChild(el);
};
