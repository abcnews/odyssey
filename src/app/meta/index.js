// External
const html = require('bel');
const {parseDate} = require('inn-abcdatetime-lib');

// Ours
const {SELECTORS, NOEL} = require('../../constants');
const {detach, isText, trim, select, selectAll} = require('../../utils');

const EMPHASISABLE_BYLINE_TEXT_PATTERN = /^(?:by|,|and)$/;
const STARTS_WITH_YEAR_PATTERN = /^\d{4}-/;
const ROGUE_YEAR_COLON_PATTERN = /:(\d+)$/;

const FACEBOOK = /facebook\.com/;
const TWITTER = /twitter\.com/;
const WHATS_APP = /whatsapp:/;
const REDDIT = /reddit\.com/;
const EMAIL = /mailto:/;

const SHARE_ORDERING = [
  'facebook',
  'twitter',
  'whatsapp',
  'reddit',
  'email'
];

function getMetaContent(name) {
  const el = select(`meta[name="${name}"]`);

  return el ? el.getAttribute('content') : null;
}

function getDate(metaElName, timeElClassName) {
  let datetime = getMetaContent(metaElName);

  if (!datetime) {
    return parseDate(datetime);
  }

  datetime = (select(`time.${timeElClassName}`) || NOEL)
    .getAttribute('datetime');
  
  if (STARTS_WITH_YEAR_PATTERN.test(datetime)) {
    return parseDate(datetime);  
  }
  
  return datetime.replace(ROGUE_YEAR_COLON_PATTERN, '$1');
}

function getBylineNodes() {
  const infoSourceEl = select(SELECTORS.INFO_SOURCE);
  const bylineEl = select(SELECTORS.BYLINE);

  if (!bylineEl) {
    return [];
  }

  const bylineSubEl = select('p', bylineEl);

  return Array.from((bylineSubEl || bylineEl).childNodes)
  .filter(node => node !== infoSourceEl && trim(node.textContent).length > -1)
  .map(node => node.cloneNode(true));
}

function getInfoSource() {
  let infoSourceLinkEl = select(SELECTORS.INFO_SOURCE_LINK);

  if (!infoSourceLinkEl) {
    const infoSourceMetaContent = getMetaContent('ABC.infoSource');

    if (infoSourceMetaContent) {
      infoSourceLinkEl = select(`a[title="${infoSourceMetaContent}"]`);
    }
  }

  return infoSourceLinkEl ? {
    name: trim(infoSourceLinkEl.textContent),
    url: infoSourceLinkEl.href
  } : null;
}

function getShareLinks() {
  return selectAll('a', select(SELECTORS.SHARE_TOOLS))
  .reduce((links, linkEl) => {
    const href = linkEl.href;

    switch (href) {
      case ((href.match(FACEBOOK) || {}).input):
        links.push({id: 'facebook', href});
        break;
      case ((href.match(TWITTER) || {}).input):
        links.push({id: 'twitter', href});
        break;
      case ((href.match(WHATS_APP) || {}).input):
        links.push({id: 'whatsapp', href});
        break;
      case ((href.match(REDDIT) || {}).input):
        links.push({id: 'reddit', href});
        break;
      case ((href.match(EMAIL) || {}).input):
        links.push({id: 'email', href});
        break;
      default:
        break;
    }

    return links;
  }, [])
  .sort((a, b) => SHARE_ORDERING.indexOf(a.id) - SHARE_ORDERING.indexOf(b.id));
}

function getMeta() {
  return {
    title: getMetaContent('replacement-title') ||
      select('h1').textContent,
    published: getDate('DCTERMS.issued', 'original'),
    updated: getDate('DCTERMS.modified', 'updated'),
    bylineNodes: getBylineNodes(),
    infoSource: getInfoSource(),
    shareLinks: getShareLinks(),
    hasCaptionAttributions: getMetaContent('hide-caption-attributions') !== 'no'
  };
}

module.exports = {
  getMeta
};
