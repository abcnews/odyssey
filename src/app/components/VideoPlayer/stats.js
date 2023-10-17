// @ts-check
import { dataLayer } from '@abcaustralia/analytics-datalayer';
import { getOrFetchDocument } from '../../utils/content';
import { getMeta } from '../../meta';
import { debug } from '../../utils/logging';

/**
 * Analytics for video progress.
 *
 * @param {string} id The document ID of the video in CoreMedia
 * @param {HTMLVideoElement} el The video player DOM element
 */
export const initialiseVideoAnalytics = (id, el) => {
  let previousTime = 0;
  let previousPercentage = 0;
  let duration = el.duration;
  let playRecorded = false;

  const contentSource = 'coremedia';
  const contentType = 'video';
  const uri = `${contentSource}://${contentType}/${id}`;

  const pushEmbedMetadata = async () => {
    const doc = await getOrFetchDocument(id, getMeta());
    debug(`analytics: push embed metadata (${uri})`);
    dataLayer.push({
      document: {
        embedded: {
          [uri]: {
            title: {
              title: doc.title
            },
            id,
            contentSource,
            contentType,
            uri,
            streamType: 'ondemand',
            mediaDuration: doc.duration
          }
        }
      }
    });
  };

  el.addEventListener('durationchange', () => {
    duration = el.duration;
  });

  el.addEventListener('play', async () => {
    if (!playRecorded) {
      await pushEmbedMetadata();
    }

    const event = playRecorded ? 'resume' : 'play';
    debug(`analytics: ${event} (${uri})`);
    dataLayer.event(event, {
      uri,
      elapsedSeconds: Math.floor(previousTime),
      elapsedPercentage: Math.floor(previousPercentage * 100)
    });
    playRecorded = true;
  });

  el.addEventListener('pause', () => {
    const event = previousTime >= duration ? 'complete' : 'pause';
    debug(`analytics: ${event} (${uri})`);
    dataLayer.event(event, {
      uri,
      elapsedSeconds: Math.floor(previousTime),
      elapsedPercentage: Math.floor(previousPercentage * 100)
    });
  });

  el.addEventListener('timeupdate', () => {
    if (duration === 0) return;

    const currentTime = el.currentTime;
    const currentPercentage = currentTime / duration;

    // Progress percentages
    [25, 50, 75, 95, 98].forEach(pct => {
      if (Math.floor(previousPercentage * 100) < pct && Math.floor(currentPercentage * 100) >= pct) {
        debug(`analytics: reached ${pct}% (${uri})`);
        dataLayer.event('progressPercentage', {
          uri,
          elapsedSeconds: Math.floor(currentTime),
          elapsedPercentage: pct
        });
      }
    });

    // Progress time
    [30].forEach(time => {
      if (Math.floor(previousTime) < time && Math.floor(currentTime) >= time) {
        debug(`analytics: reached ${time} seconds (${uri})`);
        dataLayer.event('progress', {
          uri,
          elapsedSeconds: time,
          elapsedPercentage: Math.floor(currentPercentage * 100)
        });
      }
    });

    previousTime = currentTime;
    previousPercentage = currentPercentage;
  });
};
