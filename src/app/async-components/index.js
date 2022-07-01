import { AppContextProvider } from '@abcaustralia/nucleus/es6/AppContext/AppContext';
import { GlobalStyles } from '@abcaustralia/nucleus/es6/GlobalStyles/GlobalStyles';
import React from 'react';
import ReactDOM from 'react-dom';
import './root.css';
import Icons from './Icons';
import Interactive from './Interactive';
import Nav from './Nav';

const components = {
  Interactive,
  Nav
};

let shouldIncludeIcons = true;

export const render = (componentName, props = {}, el) => {
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
