// Ours
const {after, append, create, detachAll, select, selectAll} = require('./utils');

function updateAnchor(pair) {
  selectAll(`a[name^="${pair[0]}"]`)
  .forEach(el => {
    el.setAttribute(
      'name',
      el.getAttribute('name').replace(pair[0], pair[1])
    );
  });
}

selectAll('a[name="title"]')
.forEach(el => {
  const nextEl = el.nextElementSibling;
  const metaEl = create('meta');

  metaEl.setAttribute('name', 'replacement-title');
  metaEl.setAttribute('content', nextEl.textContent);

  append(select('head'), metaEl);
  detachAll([el, nextEl]);
});

selectAll('a[name="subtitle"]')
.forEach(el => {
  let nextEl = el.nextElementSibling;

  if (select('img', nextEl) !== null || select('img', nextEl.nextElementSibling) !== null) {
    nextEl = nextEl.nextElementSibling;
  }

  const endAnchor = create('a');

  endAnchor.setAttribute('name', 'endheader');

  after(nextEl, endAnchor);
});

[
  ['subtitle', 'header'],
  ['wall', 'mosaic'],
  ['endwall', 'endmosaic'],
]
.forEach(updateAnchor);
