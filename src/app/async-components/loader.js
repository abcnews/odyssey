module.exports.PresentationLayerAsyncComponent = (componentName, props) => {
  const el = document.createElement('div');

  el.setAttribute('data-presentation-layer-async-component', '');

  import(/* webpackChunkName: "pl-components" */ '.').then(({ render }) => render(componentName, props, el));

  return el;
};
