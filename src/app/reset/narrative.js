// Ours
const { $, $$, after, append, detachAll } = require('../utils/dom');

module.exports = function() {
  // Support the old Narrative #title tag by converting it to a replacement-title meta tag
  $$('a[name="title"]').forEach(el => {
    const nextEl = el.nextElementSibling;
    const metaEl = document.createElement('meta');

    metaEl.setAttribute('name', 'replacement-title');
    metaEl.setAttribute('content', nextEl.textContent);
    append($('head'), metaEl);
    detachAll([el, nextEl]);
  });

  // Support the old Narrative #subtitle tag by readying it for conversion to a #header opener
  $$('a[name="subtitle"]').forEach(el => {
    let nextEl = el.nextElementSibling;

    if ($('img', nextEl) !== null || $('img', nextEl.nextElementSibling) !== null) {
      nextEl = nextEl.nextElementSibling;
    }

    const endTagEl = document.createElement('a');

    endTagEl.setAttribute('name', 'endheader');
    after(nextEl, endTagEl);
  });

  // Repurpose known Narrative tags with their Odyssey counterparts
  [['subtitle', 'header'], ['wall', 'mosaic'], ['endwall', 'endmosaic']].forEach(pair =>
    $$(`a[name^="${pair[0]}"]`).forEach(el =>
      el.setAttribute('name', el.getAttribute('name').replace(pair[0], pair[1]))
    )
  );
};

function repurposeAnchor(pair) {
  $$(`a[name^="${pair[0]}"]`).forEach(el => {
    el.setAttribute('name', el.getAttribute('name').replace(pair[0], pair[1]));
  });
}
