// External
const html = require('bel');

// Ours
const ShareLink = require('../ShareLink');
require('./index.scss');

module.exports = function ShareLinks(links) {
  return html`
    <div class="ShareLinks">
      ${links.map(ShareLink)}
    </div>
  `;
};
