// Ours
const { track } = require('../../utils/behaviour');

const WT__CLIP_T = 'Odyssey_VideoPlayer';
const WT__DL = '110';

module.exports.trackProgress = (id, el) => {
  const sentEvents = {};
  let eventTimes = {};
  let previousTime = 0;

  el.addEventListener('durationchange', () => {
    const duration = el.duration;

    eventTimes = {
      V: 2, // Viewed event (2 seconds in)
      25: 0.25 * duration, // 25% complete event
      50: 0.5 * duration, // 50% complete event
      75: 0.75 * duration, // 75% complete event
      F: 0.98 * duration // Clip finished event
    };
  });

  el.addEventListener('timeupdate', () => {
    const currentTime = el.currentTime;

    // Go through each defined event time and log it if it matches.
    for (let eventName in eventTimes) {
      const isCurrentTimeBeyondEventTime = currentTime > eventTimes[eventName];

      if (!sentEvents[eventName] && isCurrentTimeBeyondEventTime) {
        // Mark this event as sent so we only send it once.
        sentEvents[eventName] = true;

        // If the diff between calls is more than 5 seconds, we've
        // probably jumped elsewhere in the video. Skip any event
        // times in this round since we haven't played through them.
        if (currentTime - previousTime < 5) {
          track('video-progress', `${id}_${eventName}`);
          sendWebtrendsClipEvent(el, eventName);
        }
      } else if (sentEvents[eventName] && !isCurrentTimeBeyondEventTime) {
        // Reset that event if we jump back before it.
        sentEvents[eventName] = false;
      }
    }

    previousTime = currentTime;
  });
};

function sendWebtrendsClipEvent(el, eventName) {
  const args = {
    'DCS.dcsuri': window.location.pathname + '/' + el.src.replace(/.*\//, ''),
    'WT.clip_ev': eventName,
    'WT.clip_n': el.getAttribute('aria-label') || document.title,
    'WT.clip_t': WT__CLIP_T,
    'WT.dl': WT__DL,
    'WT.ti': document.title
  };

  if (window.Webtrends && window.Webtrends.multiTrack) {
    Webtrends.multiTrack({ args });
  } else if (window.dcsMultiTrack) {
    dcsMultiTrack.apply(null, Object.keys(args).reduce((memo, key) => memo.concat([key, args[key]]), []));
  }
}
