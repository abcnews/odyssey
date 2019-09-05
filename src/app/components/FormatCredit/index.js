// External
const html = require('bel');

// Ours
require('./index.scss');

const CREDIT = 'Storytelling format by ABC\u00a0News\u00a0Story\u00a0Lab';

module.exports = function Footer() {
  const parEl = html`
    <p></p>
  `;

  parEl.textContent = CREDIT;

  return html`
    <div class="FormatCredit">
      ${parEl}
    </div>
  `;
};
