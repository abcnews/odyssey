// External
const ns = require('util-news-selectors');

const NEWLINE = '\n';
const HYPHEN = '-';
const CSS_URL = /url\('?"?(.*?)"?'?\)/;

const SELECTORS = {
  GLOBAL_NAV: '#abcHeader.global',
  MAIN: ns('main'),
  STORY: ns('story'),
  SHARE_TOOLS: '.share-tools-list, .share, .tools',
  BYLINE: '.view-byline, header > .attribution, .byline',
  INFO_SOURCE: '.bylinepromo, .program',
  INFO_SOURCE_LINK: '.bylinepromo > a, .program > a',
  EMBED: ns('embed'),
  LEFT_EMBED: ns('embed:left'),
  RIGHT_EMBED: ns('embed:right'),
  WYSIWYG_EMBED: ns('embed:wysiwyg')
};

const EMBED_TAGNAMES = ['ASIDE', 'BLOCKQUOTE', 'DIV', 'FIGURE'];

const NOEL = document.createElement('noscript');

const REM = 16; // (px)
const MQ = {
  SM: '(max-width: 43.6875rem)',
  MD: '(min-width: 43.75rem) and (max-width: 61.1875rem)',
  LG: '(min-width: 61.25rem)',
  NOT_SM: '(min-width: 43.75rem)',
  NOT_MD: '(max-width: 43.6875rem), (min-width: 61.25rem)',
  NOT_LG: '(max-width: 61.1875rem)',
  PORTRAIT: '(orientation: portrait)',
  LANDSCAPE: '(orientation: landscape)',
  GT_4_3: '(min-aspect-ratio: 4/3)'
};

const SMALLEST_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAADs=';

const IS_PREVIEW = window.location.hostname.indexOf('nucwed') > -1;

const MS_VERSION = (ua => {
  const msie = ua.indexOf('MSIE ');

  if (msie > 0) {
    // IE 10 or older => return version number
    return parseInt(uaUA.substring(msie + 5, ua.indexOf('.', msie)), 10);
  }

  const trident = ua.indexOf('Trident/');

  if (trident > 0) {
    // IE 11 => return version number
    var rv = ua.indexOf('rv:');
    return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
  }

  const edge = ua.indexOf('Edge/');

  if (edge > 0) {
    // Edge (IE 12+) => return version number
    return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
  }
})(window.navigator.userAgent);

const SUPPORTS_PASSIVE = (isSupported => {
  try {
    const options = Object.defineProperty({}, 'passive', {
      get: function () {
        isSupported = true;
      }
    });

    window.addEventListener("test", null, options);
  } catch(err) {}

  return isSupported;
})(false);

module.exports = {
  NEWLINE,
  HYPHEN,
  CSS_URL,
  SELECTORS,
  EMBED_TAGNAMES,
  NOEL,
  REM,
  MQ,
  SMALLEST_IMAGE,
  IS_PREVIEW,
  MS_VERSION,
  SUPPORTS_PASSIVE
};
