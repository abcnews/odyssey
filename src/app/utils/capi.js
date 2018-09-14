// External
const xhr = require('xhr');

const ENDPOINT =
  window.location.hostname.indexOf('nucwed') === -1 || window.location.search.indexOf('prod') > -1
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
