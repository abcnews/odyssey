import { enqueue, subscribe } from './scheduler';
import { proximityCheck } from './utils/misc';

const AMBIENT_PLAYABLE_RANGE = 0.5;

const players = [];

let nextUntitledMediaCharCode = 65;

export const getNextUntitledMediaCharCode = () => nextUntitledMediaCharCode++;

export const forEachPlayer = fn => players.forEach(fn);

export const registerPlayer = player => {
  players.push(player);

  if (players.length === 1) {
    subscribe(_checkIfPlayersNeedToBeToggled);
  }
};

function _checkIfPlayersNeedToBeToggled(client) {
  forEachPlayer(player => {
    if (player.isUserInControl || (!player.isAmbient && !player.isScrollplay)) {
      return;
    }

    const rect = player.getRect();
    const isInPlayableRange =
      player.isAmbient && typeof player.scrollplayPct !== 'number'
        ? proximityCheck(rect, client, AMBIENT_PLAYABLE_RANGE)
        : proximityCheck(rect, client, (player.scrollplayPct || 0) / -100);

    if (
      (typeof player.isInPlayableRange === 'undefined' && isInPlayableRange) ||
      (typeof player.isInPlayableRange !== 'undefined' && isInPlayableRange !== player.isInPlayableRange)
    ) {
      enqueue(function _toggleVideoPlay() {
        player.togglePlayback(null, true);
      });
    }

    player.isInPlayableRange = isInPlayableRange;
  });
}
