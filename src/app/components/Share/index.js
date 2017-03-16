// External
const html = require('bel');

// Ours
const ShareLinks = require('../ShareLinks');

function Share({type, links}) {
  return html`
    <div class="Share">
      <div class="Share-title">Share this ${type.length ? type : 'article'}</div>
      ${ShareLinks(links)}
    </div>
  `;
}

function transformPlaceholder(placeholder, links) {
  placeholder.replaceWith(Share({type: placeholder.suffix, links}));
}

module.exports = Share;
module.exports.transformPlaceholder = transformPlaceholder;
