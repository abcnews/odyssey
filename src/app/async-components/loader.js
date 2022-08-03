export const AsyncComponent = (componentName, props) => {
  const el = document.createElement('div');

  el.setAttribute('data-async-component', componentName);
  import(/* webpackChunkName: "async-components" */ '.').then(({ render }) => render(componentName, props, el));

  return el;
};
