import html from 'nanohtml';
import { track } from '../../utils/behaviour';
import { proximityCheck } from '../../utils/misc';
import { subscribe, unsubscribe } from '../../scheduler';
import ShareLinks from '../ShareLinks';
import styles from './index.lazy.scss';

const DEFAULT_TYPE = 'story';
const INVITATION_RANGE = 0;
const UPPERCASE_PATTERN = /[A-Z]/g;

const instances = [];

const Share = ({ type, links }) => {
  if (links.length === 0) {
    return html`<div data-error="No share links to render"></div>`;
  }

  const formattedType = (type.length ? type : DEFAULT_TYPE).replace(UPPERCASE_PATTERN, x => ' ' + x.toLowerCase());

  styles.use();

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
};

export default Share;

function _checkIfFirstShareInvitationShouldBeReported(client) {
  instances.forEach(el => {
    if (proximityCheck(el.getBoundingClientRect(), client, INVITATION_RANGE)) {
      unsubscribe(_checkIfFirstShareInvitationShouldBeReported);
      track('share-invitation', '*');
    }
  });
}

export const transformMarker = (marker, links) => {
  marker.substituteWith(Share({ type: marker.configString, links }));
};
