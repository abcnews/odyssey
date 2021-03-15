const { GENERATIONS, getGeneration } = require('@abcnews/env-utils');
const { fetchOne } = require('@abcnews/terminus-fetch');

const API_KEY = '***REMOVED***';
const VERSION = getGeneration() !== GENERATIONS.PL ? 'v1' : 'v2';

// The Terminus version we use depends on the environment, so that we can match
// the version to the one which rendered the page (or use v1 for CAPI sources).
// Whether that is live or preview Terminus is handled by @abcnews/terminus-fetch
//
// - Use v1 for Phase 1 / Phase 2 generation apps (live or preview tiers)
// - Use v2 for PL generation apps unless there is a URL query params override
//
// The assumptions about which Terminus version to use for PL rendered pages are
// now in line with the assumptions made in @abcnews/terminus-fetch. That is, use
// v2 unless the terminusBaseURL query param exists, which specifies a version to
// use.

module.exports.terminusFetch = (_options, done) => {
  const options = typeof _options === 'object' ? _options : { id: _options };

  return fetchOne({ apikey: API_KEY, version: VERSION, ...options }, done);
};
