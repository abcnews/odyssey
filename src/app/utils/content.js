import { fetchOne } from '@abcnews/terminus-fetch';

const API_KEY = '***REMOVED***';

export const terminusFetch = (_options, done) => {
  const options = typeof _options === 'object' ? _options : { id: _options };

  return fetchOne({ apikey: API_KEY, ...options }, done);
};
