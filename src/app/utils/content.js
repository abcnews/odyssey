const { fetchOne } = require('@abcnews/terminus-fetch');

const API_KEY = '***REMOVED***';

module.exports.terminusFetch = (_options, done) => {
  const options = typeof _options === 'object' ? _options : { id: _options };

  return fetchOne({ apikey: API_KEY, ...options }, done);
};
