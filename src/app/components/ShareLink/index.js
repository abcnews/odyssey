// External
const html = require('bel');

// Ours
require('./index.scss');

module.exports = function ShareLink({ link, shouldBlend }) {
  return html`
    <a class="ShareLink ShareLink--${link.id}${shouldBlend ? ' u-blend-luminosity' : ''}" href="${link.href}"
      aria-label="Share this story via ${link.id}"></a>
  `;
};
