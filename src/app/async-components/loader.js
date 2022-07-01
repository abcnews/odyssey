export const PresentationLayerAsyncComponent = (componentName, props) => {
  const el = document.createElement('div');

  el.setAttribute('data-presentation-layer-async-component', componentName);
  import(/* webpackChunkName: "abc-components" */ '.').then(({ render }) => render(componentName, props, el));

  return el;
};
