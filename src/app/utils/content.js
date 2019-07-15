const terminusFetch = require('@abcnews/terminus-fetch').default;

const API_KEY = 'niste6c8345c6b3a6420a545b09f31b3';

module.exports.terminusFetch = (_options, done) => {
  const options = typeof _options === 'object' ? _options : { id: _options };

  return terminusFetch({ apikey: API_KEY, ...options }, done);
};
