// External
const html = require('bel');

// Ours
const { IS_PREVIEW } = require('../../../constants');
require('./index.scss');

const SHOULD_SHOW_WARNINGS = false;

function RestrictedFeatureWarning({ name }) {
  const message = `Usage of the ${name} feature is restricted`;

  console.warn(`[odyssey] ${message}`);

  return IS_PREVIEW && SHOULD_SHOW_WARNINGS
    ? html`
        <p class="RestrictedFeatureWarning">${`⚠️ ${message}`}</p>
      `
    : html`
        <div></div>
      `;
}

module.exports = RestrictedFeatureWarning;
