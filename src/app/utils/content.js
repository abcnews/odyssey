const { fetchOne } = require('@abcnews/terminus-fetch');

const API_KEY = 'niste6c8345c6b3a6420a545b09f31b3';

module.exports.terminusFetch = (_options, done) => {
  const options = typeof _options === 'object' ? _options : { id: _options };

  return fetchOne({ apikey: API_KEY, ...options }, done);
};
