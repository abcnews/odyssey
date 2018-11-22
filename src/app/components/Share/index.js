// External
const html = require('bel');

// Ours
const ShareLinks = require('../ShareLinks');
require('./index.scss');

const DEFAULT_TYPE = 'story';
const UPPERCASE_PATTERN = /[A-Z]/g;

function Share({ type }) {
  const formattedType = (type.length ? type : DEFAULT_TYPE).replace(UPPERCASE_PATTERN, x => ' ' + x.toLowerCase());

  return html`
    <div class="Share">
      <div class="Share-title">Share this ${formattedType}</div>
      ${ShareLinks({ shouldBlend: true })}
    </div>
  `;
}

function transformMarker(marker) {
  marker.substituteWith(Share({ type: marker.configSC }));
}

module.exports = Share;
module.exports.transformMarker = transformMarker;
