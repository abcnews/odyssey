import { terminusFetch } from '../../utils/content';

const NO_CMID_ERROR = 'No CMID available for video';

function getPosterURL(item) {
  try {
    return item.media.image ? item.media.image.poster.images['16x9'] : null;
  } catch (e) {
    return null;
  }
}

function getSources(item) {
  return item.media.video.renditions.files
    .sort((a, b) => +b.bitRate - +a.bitRate)
    .map(rendition => ({
      src: rendition.src || rendition.url,
      size: +rendition.size,
      width: +rendition.width || 0,
      height: +rendition.height || 0
    }));
}

export const getMetadata = (videoId, done) => {
  if (!videoId) {
    return done(new Error(NO_CMID_ERROR));
  }

  terminusFetch({ id: videoId, type: 'video' }, (err, item) => {
    if (err) {
      return done(err);
    }

    // Even if the first document proxies another, keep this alternativeText
    const alternativeText = item.title;

    function parseMetadata(item) {
      return done(null, {
        alternativeText,
        posterURL: getPosterURL(item),
        sources: getSources(item)
      });
    }

    if (!item.target) {
      return parseMetadata(item);
    }

    terminusFetch({ id: item.target.id, type: 'video' }, (err, targetItem) => {
      if (err) {
        return done(err);
      }

      return parseMetadata(targetItem);
    });
  });
};

export const hasAudio = el => {
  return el.mozHasAudio || !!el.webkitAudioDecodedByteCount || !!(el.audioTracks && el.audioTracks.length);
};
