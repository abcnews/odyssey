import { fetchOne } from '@abcnews/terminus-fetch';

const API_KEY = '***REMOVED***';

const cache = {};

export const terminusFetch = _options => {
  const options = typeof _options === 'object' ? _options : { id: _options };
  const key = options.id;

  if (!cache[key]) {
    cache[key] = fetchOne({ apikey: API_KEY, ...options });
  }

  return cache[key];
};
