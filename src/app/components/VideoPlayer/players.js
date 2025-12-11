// @ts-check
import { prefersReducedMotion } from '@abcnews/env-utils';
import { enqueue, subscribe } from '../../scheduler';
import { proximityCheck } from '../../utils/misc';

const AMBIENT_PLAYABLE_RANGE = 0.5;

/** @type {import('.').VideoPlayerAPI[]} */
const players = [];

let nextUntitledMediaCharCode = 65;

export const getNextUntitledMediaCharCode = () => nextUntitledMediaCharCode++;

/** @type {(fn: (value: import('.').VideoPlayerAPI) => void) => void} */
export const forEachPlayer = fn => players.forEach(fn);

/**
 * Register a video player so it can be controlled by scroll actions
 * @param {import('.').VideoPlayerAPI} player
 */
export const registerPlayer = player => {
  players.push(player);

  if (players.length === 1) {
    subscribe(_checkIfPlayersNeedToBeToggled);
  }
};

/**
 * @param {import('../../scheduler').Client} client
 */
function _checkIfPlayersNeedToBeToggled(client) {
  forEachPlayer(player => {
    if (player.isUserInControl || (!player.isAmbient && !player.isScrollplay)) {
      return;
    }

    const rect = player.getRect();
    const isInPlayableRange =
      player.isAmbient && typeof player.scrollplayPct !== 'number'
        ? proximityCheck(rect, client, player.willPlayAudio ? 0 : AMBIENT_PLAYABLE_RANGE)
        : proximityCheck(rect, client, (player.scrollplayPct || 0) / -100);

    if (isInPlayableRange || isInPlayableRange !== player.isInPlayableRange) {
      enqueue(function _toggleVideoPlay() {
        if (isInPlayableRange && !prefersReducedMotion.value) {
          player.play();
        } else {
          player.pause();
        }
      });
    }

    player.isInPlayableRange = isInPlayableRange;
  });
}
