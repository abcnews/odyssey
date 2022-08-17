// Presentation Layer usually handles activations for Decoy components in its
// tree, but because Odyssey activates a parent Decoy itself and takes control
// of the child tree, PL will no longer respond to requests to activate child
// Decoys (because they don't think the components exist any more).
//
// For this reason, Odyssey now needs to take on the responsibility of mocking
// the activation events for 'Decoy'-like nodes in its DOM tree, to honor
// requests made by other interactive apps that are running in the same page.

export const mockDecoyActivationsUnderEl = mainEl => {
  const currentlyInactiveDecoyEls = Array.from(
    mainEl.querySelectorAll('[data-component="Decoy"]:not([data-clone="true"])')
  );
  const decoyElsByKey = currentlyInactiveDecoyEls.reduce((memo, el) => {
    const key = el.getAttribute('data-key');

    if (!memo[key]) {
      memo[key] = [];
    }

    memo[key].push(el);

    return memo;
  }, {});

  if (Object.keys(decoyElsByKey).length === 0) {
    return;
  }

  window.addEventListener('decoy', event => {
    const detail = event.detail;

    if (detail && detail.active && detail.key && decoyElsByKey[detail.key]) {
      decoyElsByKey[detail.key].forEach(el => {
        el.setAttribute('data-clone', 'true');
        window.dispatchEvent(new CustomEvent('decoyActive', { detail: { key: detail.key } }));
      });
    }
  });
};
