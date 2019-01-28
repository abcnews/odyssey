module.exports.PresentationLayerAsyncComponent = (componentName, props) => {
  const el = document.createElement('div');

  el.setAttribute('data-presentation-layer-async-component', '');

  import(/* webpackChunkName: "abc-components" */ '.').then(({ render }) => render(componentName, props, el));

  return el;
};
