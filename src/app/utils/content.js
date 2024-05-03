// @ts-check
import { fetchOne } from '@abcnews/terminus-fetch';

/** @type {Record<string, Promise<object>>} */
const cache = {};

/**
 *
 * @param {{id:string; type: string}|string} optionsOrId
 * @returns {Promise<object>}
 */
export const fetchDocument = optionsOrId => {
  const options = typeof optionsOrId === 'object' ? optionsOrId : { id: optionsOrId };
  const key = options.id;

  if (!cache[key]) {
    cache[key] = fetchOne({ ...options }).then(doc => deepFreeze(doc));
  }

  return cache[key];
};

/**
 *
 * @param {{id: string, type:string} | string} optionsOrId
 * @param {import('../meta').MetaData} meta
 * @returns
 */
export const getOrFetchDocument = (optionsOrId, meta) => {
  const { id } = typeof optionsOrId === 'object' ? optionsOrId : { id: optionsOrId };
  const localDocument = meta.mediaById[id];

  return localDocument ? Promise.resolve(localDocument) : fetchDocument(optionsOrId);
};

/**
 *
 * @param {object} object
 * @returns {object}
 */
function deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);

  for (const name of propNames) {
    const value = object[name];

    if (value && typeof value === 'object') {
      deepFreeze(value);
    }
  }

  return Object.freeze(object);
}
