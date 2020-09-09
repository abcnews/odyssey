// External
const html = require('bel');

// Ours
const { track } = require('../../utils/behaviour');
const { proximityCheck } = require('../../utils/misc');
const { subscribe, unsubscribe } = require('../../scheduler');
const ShareLinks = require('../ShareLinks');
require('./index.scss');

const DEFAULT_TYPE = 'story';
const INVITATION_RANGE = 0;
const UPPERCASE_PATTERN = /[A-Z]/g;

const instances = [];

function Share({ type, links }) {
  const formattedType = (type.length ? type : DEFAULT_TYPE).replace(UPPERCASE_PATTERN, x => ' ' + x.toLowerCase());

  const el = html`
    <div class="Share">
      <div class="Share-title">Share this ${formattedType}</div>
      ${ShareLinks({ links, shouldBlend: true })}
    </div>
  `;

  instances.push(el);

  if (instances.length === 1) {
    subscribe(_checkIfFirstShareInvitationShouldBeReported);
  }

  return el;
}

function _checkIfFirstShareInvitationShouldBeReported(client) {
  instances.forEach((el, index) => {
    if (proximityCheck(el.getBoundingClientRect(), client, INVITATION_RANGE)) {
      unsubscribe(_checkIfFirstShareInvitationShouldBeReported);
      track('share-invitation', '*');
    }
  });
}

function transformMarker(marker, links) {
  marker.substituteWith(Share({ type: marker.configString, links }));
}

module.exports = Share;
module.exports.transformMarker = transformMarker;
