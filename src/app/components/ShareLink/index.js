// External
const html = require('bel');

// Ours
const { track } = require('../../utils/behaviour');

require('./index.scss');

module.exports = function ShareLink({ link, shouldBlend }) {
  return html`
    <a
      class="ShareLink ShareLink--${link.id}${shouldBlend ? ' u-blend-luminosity' : ''}"
      href="${link.href}"
      onclick="${() => track('share-link', link.id)}"
      aria-label="Share this story via ${link.id}"
    ></a>
  `;
};
