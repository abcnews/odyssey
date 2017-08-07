require('./polyfills');

// Ours
const {$, $$, after, append, detachAll} = require('./app/utils/dom');

function updateAnchor(pair) {
  $$(`a[name^="${pair[0]}"]`)
  .forEach(el => {
    el.setAttribute(
      'name',
      el.getAttribute('name').replace(pair[0], pair[1])
    );
  });
}

$$('a[name="title"]')
.forEach(el => {
  const nextEl = el.nextElementSibling;
  const metaEl = document.createElement('meta');

  metaEl.setAttribute('name', 'replacement-title');
  metaEl.setAttribute('content', nextEl.textContent);
  append($('head'), metaEl);
  detachAll([el, nextEl]);
});

$$('a[name="subtitle"]')
.forEach(el => {
  let nextEl = el.nextElementSibling;

  if ($('img', nextEl) !== null || $('img', nextEl.nextElementSibling) !== null) {
    nextEl = nextEl.nextElementSibling;
  }

  const endTagEl = document.createElement('a');

  endTagEl.setAttribute('name', 'endheader');
  after(nextEl, endTagEl);
});

[
  ['subtitle', 'header'],
  ['wall', 'mosaic'],
  ['endwall', 'endmosaic'],
]
.forEach(updateAnchor);
