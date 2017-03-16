// External
const html = require('bel');

// Ours
const ShareLinks = require('../ShareLinks');

const DEFAULT_TYPE = 'story';
const UPPERCASE_PATTERN = /[A-Z]/g;

function Share({type, links}) {
  const formattedType = (type.length ? type : DEFAULT_TYPE)
    .replace(UPPERCASE_PATTERN, x => ' ' + x.toLowerCase());

  return html`
    <div class="Share">
      <div class="Share-title">Share this ${formattedType}</div>
      ${ShareLinks(links)}
    </div>
  `;
}

function transformPlaceholder(placeholder, links) {
  placeholder.replaceWith(Share({type: placeholder.suffix, links}));
}

module.exports = Share;
module.exports.transformPlaceholder = transformPlaceholder;
