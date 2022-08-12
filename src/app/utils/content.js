import { fetchOne } from '@abcnews/terminus-fetch';
import { getMeta } from '../meta';

const API_KEY = '***REMOVED***';

const cache = {};

export const fetchDocument = _options => {
  const options = typeof _options === 'object' ? _options : { id: _options };
  const key = options.id;

  if (!cache[key]) {
    cache[key] = fetchOne({ apikey: API_KEY, ...options }).then(doc => deepFreeze(doc));
  }

  return cache[key];
};

export const getOrFetchDocument = _options => {
  const { id } = typeof _options === 'object' ? _options : { id: _options };
  const localDocument = getMeta().mediaById[id];

  return localDocument ? Promise.resolve(localDocument) : fetchDocument(_options);
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
