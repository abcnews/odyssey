const { GENERATIONS, TIERS, getGeneration, getTier } = require('@abcnews/env-utils');
const { fetchOne } = require('@abcnews/terminus-fetch');

const API_KEY = '***REMOVED***';
const VERSION = getGeneration() !== GENERATIONS.PL || getTier() === TIERS.PREVIEW ? 'v1' : 'v2';

// The Terminus version we use depends on the environment, so that we can match
// the version to the one which rendered the page (or use v1 for CAPI sources).
// Whether that is live or preview Terminus is handled by @abcnews/terminus-fetch
//
// - Use v1 for Phase 1 / Phase 2 generation apps (live or preview tiers)
// - Use v1* for PL generation apps on the preview tier
// - Use v2 for PL generation apps on the live tier
//
// *: @abcnews/terminus-fetch will allow the endpoint (including version) to
// be overridden by the terminusBaseURL URL param, which is useful because CM10
// uses it to render its own (PL generation) preview windows with v2.

module.exports.terminusFetch = (_options, done) => {
  const options = typeof _options === 'object' ? _options : { id: _options };

  return fetchOne({ apikey: API_KEY, version: VERSION, ...options }, done);
};
