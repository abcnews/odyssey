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

module.exports = {
  NEWLINE,
  HYPHEN,
  SELECTORS,
  EMBED_TAGNAMES,
  NOEL,
  MQ,
  SMALLEST_IMAGE,
  IS_PREVIEW
};
