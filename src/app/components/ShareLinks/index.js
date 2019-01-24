// External
const html = require('bel');

// Ours
const ShareLink = require('../ShareLink');
require('./index.scss');

module.exports = function ShareLinks({ links, shouldBlend }) {
  return html`
    <div class="ShareLinks">${links.map(link => ShareLink({ link, shouldBlend }))}</div>
  `;
};
