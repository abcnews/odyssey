// External
import html from 'bel';

// Ours
import { track } from '../../utils/behaviour';
import { proximityCheck } from '../../utils/misc';
import { subscribe, unsubscribe } from '../../scheduler';
import ShareLinks from '../ShareLinks';
import './index.scss';

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

  return el;
}

export function transformMarker(marker, links) {
  marker.substituteWith(Share({ type: marker.configSC, links }));
}

subscribe(function __reportFirstInvitation(client) {
  instances.forEach((el, index) => {
    if (proximityCheck(el.getBoundingClientRect(), client, INVITATION_RANGE)) {
      unsubscribe(__reportFirstInvitation);
      track('share-invitation', '*');
    }
  });
});

export default Share;
