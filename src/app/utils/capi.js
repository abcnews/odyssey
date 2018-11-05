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

const REAL_MEDIA_HOST = 'mpegmedia.abc.net.au';
const PROXIED_MEDIA_HOST = 'abcmedia.akamaized.net';

// The Content API is not returning proxied asset URLs (yet)
module.exports.rewriteAssetURL = url => url.replace(REAL_MEDIA_HOST, PROXIED_MEDIA_HOST);
