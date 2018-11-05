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

const UNSAFE_MEDIA_HOST = 'http://mpegmedia.abc.net.au';
const SECURE_MEDIA_HOST = 'https://abcmedia.akamaized.net';

// The Content API is not returning https-enabled asset URLs (yet)
module.exports.rewriteAssetURL = url => url.replace(UNSAFE_MEDIA_HOST, SECURE_MEDIA_HOST);
