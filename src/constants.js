// External
const ns = require('util-news-selectors');

const NEWLINE = '\n';
const HYPHEN = '-';

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

const MQ = {
  SM: '(max-width: 699px)',
  MD: '(min-width: 700px) and (max-width: 979px)',
  LG: '(min-width: 980px)',
  NOT_SM: '(min-width: 700px)',
  NOT_MD: '(max-width: 699px) or (min-width: 980px)',
  NOT_LG: ' (max-width: 979px)',
  PORTRAIT: '(orientation: portrait)',
  LANDSCAPE: '(orientation: landscape)'
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


module.exports = {
  NEWLINE,
  HYPHEN,
  SELECTORS,
  EMBED_TAGNAMES,
  NOEL,
  MQ,
  SMALLEST_IMAGE,
  IS_PREVIEW,
  MS_VERSION
};
