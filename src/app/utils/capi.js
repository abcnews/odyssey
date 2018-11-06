// External
const xhr = require('xhr');

// Ours
const { IS_PREVIEW } = require('../../constants');

const ENDPOINT =
  !IS_PREVIEW || window.location.search.indexOf('prod') > -1
    ? 'https://content-gateway.abc-prod.net.au'
    : 'http://nucwed.aus.aunty.abc.net.au';

module.exports.getDocument = (cmid, done) => {
  if (!cmid.length && cmid != +cmid) {
    return done(new Error(`Invalid CMID: ${cmid}`));
  }

  xhr(
    {
      responseType: 'json',
      uri: `${ENDPOINT}/api/v2/content/id/${cmid}`
    },
    (error, response, content) => {
      if (error || response.statusCode !== 200) {
        return done(error || new Error(response.statusCode));
      }

      done(null, typeof content === 'object' ? content : JSON.parse(content));
    }
  );
};

// The Content API is not returning proxied asset URLs (yet). However, this built JS
// asset _is_ rewritten on-the-fly, so we need to obscure the host somewhat
const GENIUNE_MEDIA_ORIGIN = ['http', '://', 'mpegmedia', '.abc.net.au'].join('');
const PROXIED_MEDIA_ORIGIN = 'https://abcmedia.akamaized.net';
module.exports.rewriteAssetURL = url => url.replace(GENIUNE_MEDIA_ORIGIN, PROXIED_MEDIA_ORIGIN);
