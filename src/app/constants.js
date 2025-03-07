export const NEWLINE = '\n';
export const HYPHEN = '-';
export const CSS_URL = /url\('?"?(.*?)"?'?\)/;
export const ALIGNMENT_PATTERN = /(left|right)/;
export const ONLY_RATIO_PATTERN = /^\d+x\d+$/;
export const SM_RATIO_PATTERN = /sm(\d+x\d+)/;
export const MD_RATIO_PATTERN = /md(\d+x\d+)/;
export const LG_RATIO_PATTERN = /lg(\d+x\d+)/;
export const XL_RATIO_PATTERN = /xl(\d+x\d+)/;
export const VIDEO_MARKER_PATTERN = /(?:video|youtube)(\w+)/;
export const IMAGE_MARKER_PATTERN = /(?:image)(\d+)/;
export const SCROLLPLAY_PCT_PATTERN = /scrollplay(\d+)/;

export const SELECTORS = {
  MAIN: 'main#content',
  STORY: [
    '[data-component="Decoy"][data-key="article"]>div>div:not([class])',
    '[data-component="Decoy"][data-key="article"]>div>div[data-component="QuickReads"]>div:not([class])',
    '[data-component="Decoy"][data-key="article"] [data-component="GridRow"] div:not([class])'
  ].join(','),
  SHARE_TOOLS: '[data-component="FixedHeader"] [data-component="Popover"]',
  SHARE_UTILITY: '[data-component=ShareUtility]', // Future News
  BYLINE: [
    'header [data-component="Heading"]~[data-component="Byline"]',
    '[data-component="ArticleHeadline"] [class^="ArticleHeadlineTitleByline"]' // Future News
  ].join(','),
  HEADER_TAGS: '[data-component="ArticleHeadline"] [class^="CardTagList"]', // Future News
  METADATA: '[data-component="ArticleHeadline"] [class^="ArticleHeadlineTitle_meta"]',
  WYSIWYG_EMBED: '[data-component="LegacyWysiwyg"],[data-component="RelatedCard"]',
  QUOTE: '[data-component="Blockquote"],[data-component="EmphasisedText"],[data-component="Pullquote"]',
  IFRAME: ':has([data-component="Iframe"])'
};

export const RICHTEXT_BLOCK_TAGNAMES = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'OL', 'UL'];
export const EMBED_TAGNAMES = ['ASIDE', 'BLOCKQUOTE', 'DIV', 'FIGURE'];

export const MOCK_NODE = {
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

export const MOCK_ELEMENT = {
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
  hasAttribute: _ => false,
  matches: _ => false
};

export const MOCK_TEXT = {
  ...MOCK_NODE,
  nodeType: Node.TEXT_NODE
};

export const UNIT = 16; // (px)
export const BP = {
  MD: UNIT * 43.75,
  LG: UNIT * 61.25,
  XL: UNIT * 112.5
};
export const MQ = {};
MQ.LT_MD = `(max-width: ${BP.MD - 1}px)`;
MQ.GT_SM = `(min-width: ${BP.MD}px)`;
MQ.LT_LG = `(max-width: ${BP.LG - 1}px)`;
MQ.GT_MD = `(min-width: ${BP.LG}px)`;
MQ.LT_XL = `(max-width: ${BP.XL - 1}px)`;
MQ.GT_LG = `(min-width: ${BP.XL}px)`;
MQ.SM = MQ.LT_MD;
MQ.MD = `${MQ.GT_SM} and ${MQ.LT_LG}`;
MQ.LG = `${MQ.GT_MD} and ${MQ.LT_XL}`;
MQ.XL = MQ.GT_LG;
MQ.PORTRAIT = '(orientation: portrait)';
MQ.LANDSCAPE = '(orientation: landscape)';
MQ.LANDSCAPE_LT_LG = `${MQ.LANDSCAPE} and ${MQ.LT_LG}`;
MQ.GT_4_3 = '(min-aspect-ratio: 4/3)';
MQ.PL_SM = `(max-width: ${UNIT * 34 - 1}px)`;

export const MQL = Object.keys(MQ).reduce((memo, key) => {
  memo[key] = window.matchMedia(MQ[key]);

  return memo;
}, {});
window.ODYSSEY_MQL = MQL;

export const SMALLEST_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAADs=';

export const SUPPORTS_PASSIVE = (isSupported => {
  try {
    const options = Object.defineProperty({}, 'passive', {
      get: function () {
        isSupported = true;
      }
    });

    window.addEventListener('test', null, options);
  } catch (err) {}

  return isSupported;
})(false);

export const INFO_SOURCE_LOGOS_HTML_FRAGMENT_ID = '10766144'; // This document is managed in Core Media

export const IS_PROBABLY_RESISTING_FINGERPRINTING = (() => {
  // performance.mark will return undefined or a PerformanceMark object, depending on spec
  performance.mark && performance.mark('odyssey');

  // performance.getEntries will return an array of PerformanceEntry objects
  return ((performance.getEntries && performance.getEntries()) || []).length === 0;
})();

export const PLACEHOLDER_IMAGE_CUSTOM_PROPERTY = '--placeholder-image';

export const EMBED_ALIGNMENT_MAP = {
  floatLeft: 'left',
  floatRight: 'right'
};

/**
 * This is the default news PL theme. Don't be fooled by the 'light' in 'light-blue' – there is
 * a dark variant of this theme. The light/dark is controlled by a 'scheme' variable in PL.
 *
 * TODO: This is hard coded in Odyssey for now, but we may want to adopt the PL themes which can
 * be found on the `data-scheme` attribute on `<body>`
 */
export const THEME = 'light-blue';
