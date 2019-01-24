// External
const html = require('bel');

// Ours
const { setText } = require('../../utils/dom');
const { twoDigits, whenKeyIn } = require('../../utils/misc');
require('./index.scss');

const STEP_SECONDS = 5;

function VideoControls(player, hasAmbientParent) {
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

  const playbackEl = html`
    <button
      class="VideoControls-playback"
      aria-label="${`Play video, ${player.getTitle()}`}"
      onkeydown=${hasAmbientParent ? null : whenKeyIn([37, 38, 39, 40], steppingKeyDown)}
      onkeyup=${hasAmbientParent ? null : whenKeyIn([37, 38, 39, 40], steppingKeyUp)}
      onclick=${player.togglePlayback}
    ></button>
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
    : html`
        <time class="VideoControls-timeRemaining" aria-label="Time Remaining"></time>
      `;
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
  const progressEl = hasAmbientParent
    ? null
    : html`
        <div class="VideoControls-progress">${progressBarEl}</div>
      `;
  const videoControlsEl = html`
    <div class="VideoControls">${playbackEl} ${muteEl} ${progressEl} ${timeRemainingEl}</div>
  `;

  if (!hasAmbientParent) {
    progressEl.addEventListener('mousedown', scrubStart);
    progressEl.addEventListener('touchstart', scrubStart, { passive: true });
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

  return videoControlsEl;
}

module.exports = VideoControls;
