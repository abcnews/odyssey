// External
const html = require('bel');

// Ours
const ShareLinks = require('../ShareLinks');

module.exports = function Nav({homeHref = '/news/', shareLinks}) {
  return html`
    <div class="Nav">
      <div class="Nav-bar">
        <a class="Nav-home" href="${homeHref}">ABC News</a>
        ${ShareLinks(shareLinks)}
      </div>
    </div>
  `;
};
