const NEWLINE = '\n';
const HYPHEN = '-';
const CSS_URL = /url\('?"?(.*?)"?'?\)/;
const ALIGNMENT_PATTERN = /(left|right)/;
const ONLY_RATIO_PATTERN = /^\d+x\d+$/;
const RATIO_PATTERN = /(\d+x\d+)/;
const SM_RATIO_PATTERN = /sm(\d+x\d+)/;
const MD_RATIO_PATTERN = /md(\d+x\d+)/;
const LG_RATIO_PATTERN = /lg(\d+x\d+)/;
const XL_RATIO_PATTERN = /xl(\d+x\d+)/;
const VIDEO_MARKER_PATTERN = /(?:video|youtube)(\w+)/;
const SCROLLPLAY_PCT_PATTERN = /scrollplay(\d+)/;

const SELECTORS = {
  GLOBAL_NAV: '#abcHeader.global',
  MAIN: '.page_margins#main_content,body>.content,.main-content-container',
  STORY: '.article.section,article>.story.richtext,.article-detail-page .article-text',
  SHARE_TOOLS: '.share-tools-list,.share,.tools',
  TITLE: '.article h1,header>h1,h1[itemprop="name"]',
  BYLINE: '.view-byline,header>.attribution,.byline',
  INFO_SOURCE: '.bylinepromo,.program',
  INFO_SOURCE_LINK: '.bylinepromo>a,.program>a',
  WYSIWYG_EMBED: '.inline-content.wysiwyg,.embed-wysiwyg.richtext,.view-wysiwyg',
  QUOTE:
    'blockquote:not([class]),.quote--pullquote,.inline-content.quote,.embed-quote,.comp-rich-text-blockquote,.view-inline-pullquote'
};

const RICHTEXT_BLOCK_TAGNAMES = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'OL', 'UL'];
const EMBED_TAGNAMES = ['ASIDE', 'BLOCKQUOTE', 'DIV', 'FIGURE'];

const MOCK_NODE = {
  nodeValue: '',
  parentNode: null,
  parentElement: null,
  previousSibling: null,
  nextSibling: null,
  childNodes: [],
  firstChild: null,
  lastChild: null,
  textContent: ''
};

const MOCK_ELEMENT = {
  ...MOCK_NODE,
  nodeType: Node.ELEMENT_NODE,
  tagName: 'MOCK-ELEMENT',
  attributes: [],
  name: '',
  className: '',
  classList: [],
  previousElementSibling: null,
  nextElementSibling: null,
  children: [],
  childElementCount: 0,
  firstElementChild: null,
  lastElementChild: null,
  innerHTML: '',
  getAttribute: _ => '',
  hasAttribute: _ => false
};

const MOCK_TEXT = {
  ...MOCK_NODE,
  nodeType: Node.TEXT_NODE
};

const REM = 16; // (px)
const MQ = {};
MQ.LT_MD = '(max-width: 43.6875rem)';
MQ.GT_SM = '(min-width: 43.75rem)';
MQ.LT_LG = '(max-width: 61.1875rem)';
MQ.GT_MD = '(min-width: 61.25rem)';
MQ.LT_XL = '(max-width: 112.4375rem)';
MQ.GT_LG = '(min-width: 112.5rem)';
MQ.SM = MQ.LT_MD;
MQ.MD = `${MQ.GT_SM} and ${MQ.LT_LG}`;
MQ.LG = `${MQ.GT_MD} and ${MQ.LT_XL}`;
MQ.XL = MQ.GT_LG;
MQ.PORTRAIT = '(orientation: portrait)';
MQ.LANDSCAPE = '(orientation: landscape)';
MQ.GT_4_3 = '(min-aspect-ratio: 4/3)';
MQ.PL_SM = '(max-width: 33.9375em)';

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
      get: function() {
        isSupported = true;
      }
    });

    window.addEventListener('test', null, options);
  } catch (err) {}

  return isSupported;
})(false);

module.exports = {
  NEWLINE,
  HYPHEN,
  CSS_URL,
  ALIGNMENT_PATTERN,
  ONLY_RATIO_PATTERN,
  RATIO_PATTERN,
  SM_RATIO_PATTERN,
  MD_RATIO_PATTERN,
  LG_RATIO_PATTERN,
  XL_RATIO_PATTERN,
  VIDEO_MARKER_PATTERN,
  SCROLLPLAY_PCT_PATTERN,
  SELECTORS,
  RICHTEXT_BLOCK_TAGNAMES,
  EMBED_TAGNAMES,
  MOCK_NODE,
  MOCK_ELEMENT,
  MOCK_TEXT,
  REM,
  MQ,
  SMALLEST_IMAGE,
  IS_PREVIEW,
  MS_VERSION,
  SUPPORTS_PASSIVE
};
