// External
const html = require('bel');

// Ours
const { track } = require('../../utils/behaviour');
require('./index.scss');

const LINK_URL = '/news/interactives/';
const LINK_TRACKER = () => track('format-credit-link', '*');

module.exports = function FormatCredit() {
  return html`
    <div class="FormatCredit">
      <p>
        <span>Odyssey format by </span>
        <a href=${LINK_URL} onclick=${LINK_TRACKER}>ABC News Story Lab</a>
      </p>
    </div>
  `;
};
