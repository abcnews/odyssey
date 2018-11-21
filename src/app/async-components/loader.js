module.exports.PresentationLayerAsyncComponent = (componentName, props) => {
  const el = document.createElement('div');

  el.setAttribute('data-presentation-layer-async-component', '');

  import('.').then(({ render }) => render(componentName, props, el));

  return el;
};
