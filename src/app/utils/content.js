const terminusFetch = require('@abcnews/terminus-fetch').default;

const API_KEY = '***REMOVED***';

module.exports.terminusFetch = (_options, done) => {
  const options = typeof _options === 'object' ? _options : { id: _options };

  return terminusFetch({ apikey: API_KEY, ...options }, done);
};
