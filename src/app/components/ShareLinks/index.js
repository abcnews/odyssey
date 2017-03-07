// External
const html = require('bel');

// Ours
const ShareLink = require('../ShareLink');

module.exports = function ShareLinks(links) {
  return html`
    <div class="ShareLinks">
      ${links.map(ShareLink)}
    </div>
  `;
};
