// @ts-check
import { dataLayer } from '@abcaustralia/analytics-datalayer';
import { debug } from '../../utils/logging';

/**
 * Analytics for video progress.
 *
 * @param {string} id The document ID of the video in CoreMedia
 * @param {HTMLVideoElement} el The video player DOM element
 */
export const trackProgress = (id, el) => {
  let eventTimes = [15, 30];
  let previousTime = 0;
  let previousPercentage = 0;
  let duration = el.duration;
  let playRecorded = false;

  const uri = `coremedia://video/${id}`;

  el.addEventListener('durationchange', () => {
    duration = el.duration;
    eventTimes = [15, 30];
    for (let i = 1; i <= duration / 60; i++) {
      eventTimes.push(i * 60);
    }
  });

  el.addEventListener('play', () => {
    const event = playRecorded ? 'resume' : 'play';
    debug(`${uri} ${event}`);
    sendProgressEvents(event, {
      uri,
      elapsedSeconds: Math.floor(previousTime),
      elapsedPercentage: Math.floor(previousPercentage)
    });
    playRecorded = true;
  });

  el.addEventListener('pause', () => {
    debug(`${uri} paused`);
    sendProgressEvents('pause', {
      uri,
      elapsedSeconds: Math.floor(previousTime),
      elapsedPercentage: Math.floor(previousPercentage)
    });
  });

  el.addEventListener('timeupdate', () => {
    if (duration === 0) return;

    const currentTime = el.currentTime;
    const currentPercentage = currentTime / duration;

    // Progress percentages
    [25, 50, 75, 95, 98].forEach(pct => {
      if (Math.floor(previousPercentage * 100) < pct && Math.floor(currentPercentage * 100) >= pct) {
        debug(`${uri} reached ${pct}%`);
        sendProgressEvents('progressPercentage', {
          uri,
          elapsedSeconds: Math.floor(currentTime),
          elapsedPercentage: pct
        });
      }
    });

    // Progress time
    eventTimes.forEach(time => {
      if (Math.floor(previousTime) < time && Math.floor(currentTime) >= time) {
        debug(`${uri} reached ${time} seconds`);
        sendProgressEvents('progress', {
          uri,
          elapsedSeconds: time,
          elapsedPercentage: Math.floor(currentPercentage)
        });
      }
    });

    previousTime = currentTime;
    previousPercentage = currentPercentage;
  });
};

/**
 * @type {typeof import('@abcaustralia/analytics-datalayer').dataLayer.event}
 */
const sendProgressEvents = (eventName, data) => {
  dataLayer.event(eventName, data);
};
