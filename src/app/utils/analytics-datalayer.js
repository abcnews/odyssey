// @ts-check

// This file re-implements the small subset of functions we need from @abcaustralia/analytics-datalayer
// We would utilise that package, but using it outside the PL ecosystem is painful and this is a simple
// solution. We should re-visit this at some point, particularly in light of the much better types the
// package offers.

/** Push any general data into the datalayer */
const handlePush = data => {
  if (typeof window !== 'undefined') {
    if (typeof window.dataLayer === 'undefined') {
      window.dataLayer = [];
    }
    window.dataLayer.push(data);
    window.document.dispatchEvent(new CustomEvent('dataLayer.push', { detail: data }));
  }
};

const handleUnstructuredEvent = event => {
  const { action, label, value, property } = event;
  handlePush({
    event: 'unstructuredEvent',
    eventAction: action,
    eventLabel: label,
    eventValue: value,
    eventProperty: property
  });
};

/** Trigger an event via the datalayer */
const handleEvent = (eventName, events) => {
  handlePush({
    event: eventName,
    events
  });
};

export const dataLayer = {
  push: handlePush,
  event: handleEvent,
  unstructuredEvent: handleUnstructuredEvent
};
