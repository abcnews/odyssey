// @ts-check
import { dataLayer } from '@abcaustralia/analytics-datalayer';

/**
 * track
 * @summary Use ABC's Analytics DataLayer package to track user behaviour.
 * @param {string} name - The name of the behaviour we're tracking
 * @param {string} label - The label to apply to this event
 *
 */
export const track = (name, label) => {
  if (name == null || label == null) {
    throw new Error('Behaviour tracking requires a name and label');
  }

  dataLayer.unstructuredEvent({
    action: `odyssey-${name}`,
    label
  });
};
