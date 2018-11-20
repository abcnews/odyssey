// External
const html = require('bel');

// Ours
const { shareLinks } = require('../../env');
const ShareLink = require('../ShareLink');

require('./index.scss');

module.exports = function ShareLinks({ shouldBlend } = {}) {
  return html`
    <div class="ShareLinks">${shareLinks.map(link => ShareLink({ link, shouldBlend }))}</div>
  `;
};
