// @ts-check

import { dataLayer } from './analytics-datalayer';

/**
 * Tracks user behaviour specifically related to Odyssey.
 * @summary Use ABC's Analytics DataLayer package to track user behaviour.
 * @param {string} name - The name of the behaviour we're tracking
 * @param {string} label - The label to apply to this event
 *
 */
export const track = async (name, label) => {
  if (name == null || label == null) {
    throw new Error('Behaviour tracking requires a name and label');
  }

  dataLayer.unstructuredEvent({
    action: `odyssey-${name}`,
    label
  });
};

/**
 * Record a pre-defined analytics event
 * @todo Better type definitions for eventData
 * @param {"share"|"progress"|"progressPercentage"|"resume"|"play"|"complete"|"pause"} eventName The name of the analytics event to record
 * @param {Record<string, any>} eventData The event data
 */
export const analyticsEvent = async (eventName, eventData) => {
  dataLayer.event(eventName, eventData);
};

/**
 * Push additional data about the current page to the analytics system
 *
 * @param {Record<string, any>} eventData Event data to push to the analytics system
 */
export const analyticsPush = async eventData => {
  dataLayer.push(eventData);
};
