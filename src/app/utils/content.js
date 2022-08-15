import { fetchOne } from '@abcnews/terminus-fetch';

const API_KEY = '***REMOVED***';

const cache = {};

export const fetchDocument = optionsOrId => {
  const options = typeof optionsOrId === 'object' ? optionsOrId : { id: optionsOrId };
  const key = options.id;

  if (!cache[key]) {
    cache[key] = fetchOne({ apikey: API_KEY, ...options }).then(doc => deepFreeze(doc));
  }

  return cache[key];
};

export const getOrFetchDocument = (optionsOrId, meta) => {
  const { id } = typeof optionsOrId === 'object' ? optionsOrId : { id: optionsOrId };
  const localDocument = meta.mediaById[id];

  return localDocument ? Promise.resolve(localDocument) : fetchDocument(optionsOrId);
};

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
