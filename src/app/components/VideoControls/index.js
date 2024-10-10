// @ts-check
import html from 'nanohtml';
import { isProgressElement, setText } from '../../utils/dom';
import { twoDigits, whenKeyIn } from '../../utils/misc';
import { getMeta } from '../../meta';
import styles from './index.lazy.scss';

/**
 * @typedef {object} VideoControlsAPI
 * @prop {(label: string) => void} setMuteLabel
 * @prop {() => boolean} isScrubbing
 * @prop {(label: string) => void} setPlaybackLabel
 * @prop {(value: number) => void} setProgress
 * @prop {(secondsRemaining: number) => void} setTimeRemaining
 */

/**
 * @typedef {HTMLElement & {api?: VideoControlsAPI}} VideoControlsEl
 */

const STEP_SECONDS = 5;

/**
 * Initialise a video player controls element
 * @param {import('../VideoPlayer').VideoPlayerAPI} player
 * @param {boolean} [hasAmbientParent]
 * @param {HTMLElement} [videoDuration]
 * @returns {VideoControlsEl}
 */
const VideoControls = (player, hasAmbientParent, videoDuration) => {
  let steppingKeysHeldDown = [];
  let wasPlayingBeforeStepping;
  let isScrubbing;
  let wasPlayingBeforeScrubbing;

  function steppingKeyDown(event) {
    event.preventDefault();

    if (steppingKeysHeldDown.length === 0) {
      wasPlayingBeforeStepping = !player.isPaused();

      if (wasPlayingBeforeStepping) {
        player.pause();
      }
    }

    if (steppingKeysHeldDown.indexOf(event.keyCode) < 0) {
      steppingKeysHeldDown.push(event.keyCode);
    }

    if (steppingKeysHeldDown.indexOf(event.keyCode) === steppingKeysHeldDown.length - 1) {
      const isSteppingForwards = event.keyCode === 38 || event.keyCode === 39;

      player.jumpBy(STEP_SECONDS * (isSteppingForwards ? 1 : -1));
    }
  }

  function steppingKeyUp(event) {
    steppingKeysHeldDown.splice(steppingKeysHeldDown.indexOf(event.keyCode), 1);

    if (steppingKeysHeldDown.length === 0 && wasPlayingBeforeStepping) {
      player.play();
    }
  }

  function scrubStart(event) {
    isScrubbing = true;
    wasPlayingBeforeScrubbing = !player.isPaused();
    player.pause();
    scrub(event, !!event.touches);
  }

  function scrub(event, isPassive) {
    if (!isScrubbing) {
      return;
    }

    if (!progressEl) {
      return;
    }

    if (!isPassive) {
      event.preventDefault();
    }

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const rect = progressEl.getBoundingClientRect();

    player.jumpToPct((clientX - rect.left) / rect.width);
  }

  function scrubEnd() {
    if (!isScrubbing) {
      return;
    }

    if (wasPlayingBeforeScrubbing) {
      player.play();
    }

    isScrubbing = false;
  }

  const { isFuture } = getMeta();

  const preplayButton = html`
    <div class="VideoPlayStart">
      <div class="PlayIcon"></div>
      <span>Watch ${videoDuration}</span>
    </div>
  `;
  const playbackEl = html`
    <button
      class="VideoControls-playback"
      aria-label="${`Play video, ${player.getTitle()}`}"
      onkeydown=${hasAmbientParent ? null : whenKeyIn([37, 38, 39, 40], steppingKeyDown)}
      onkeyup=${hasAmbientParent ? null : whenKeyIn([37, 38, 39, 40], steppingKeyUp)}
      onclick=${player.togglePlayback}
    >
      ${isFuture ? preplayButton : ''}
    </button>
  `;
  const muteEl = hasAmbientParent
    ? null
    : html`
        <button
          class="VideoControls-mute"
          aria-label="${player.isMuted() ? 'Unmute' : 'Mute'}"
          onclick=${player.toggleMutePreference}
        ></button>
      `;
  const timeRemainingEl = hasAmbientParent
    ? null
    : html`<time class="VideoControls-timeRemaining" aria-label="Time Remaining"></time>`;

  const progressBarEl = hasAmbientParent
    ? null
    : html`
        <progress
          class="VideoControls-progressBar"
          aria-label="Percentage Complete"
          max="100"
          draggable="false"
        ></progress>
      `;
  if (!isProgressElement(progressBarEl) && progressBarEl !== null) {
    throw new Error('Something went wrong constructing the progress bar element');
  }

  const progressEl = hasAmbientParent ? null : html`<div class="VideoControls-progress">${progressBarEl}</div>`;
  /** @type {HTMLElement & {api?: VideoControlsAPI}} */
  const videoControlsEl = html`
    <div class="VideoControls">${playbackEl} ${muteEl} ${progressEl} ${timeRemainingEl}</div>
  `;

  if (!hasAmbientParent) {
    progressEl && progressEl.addEventListener('mousedown', scrubStart);
    progressEl && progressEl.addEventListener('touchstart', scrubStart, { passive: true });
    document.addEventListener('mousemove', scrub);
    document.addEventListener('touchmove', scrub, { passive: true });
    document.addEventListener('mouseup', scrubEnd);
    document.addEventListener('touchend', scrubEnd);
    document.addEventListener('touchcancel', scrubEnd);
  }

  videoControlsEl.api = {
    setMuteLabel: label => muteEl && muteEl.setAttribute('aria-label', label),
    isScrubbing: () => isScrubbing,
    setPlaybackLabel: label => playbackEl.setAttribute('aria-label', label),
    setProgress: value => progressBarEl && (progressBarEl.value = value),
    setTimeRemaining: secondsRemaining => {
      if (!timeRemainingEl) {
        return;
      }

      const formattedNegativeTimeFromEnd = isNaN(secondsRemaining)
        ? ''
        : `${secondsRemaining > 0 ? '-' : ''}${twoDigits(Math.floor(secondsRemaining / 60))}:${twoDigits(
            Math.round(secondsRemaining % 60)
          )}`;

      setText(timeRemainingEl, formattedNegativeTimeFromEnd);
    }
  };

  styles.use();

  return videoControlsEl;
};

export default VideoControls;
