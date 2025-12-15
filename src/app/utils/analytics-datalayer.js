// @ts-check

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
