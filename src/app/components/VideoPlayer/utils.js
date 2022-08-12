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

  terminusFetch({ id: videoId, type: 'video' })
    .then(videoDocOrVideoProxyDoc => {
      function parseMetadata(videoDoc) {
        return done(null, {
          alternativeText,
          posterURL: getPosterURL(videoDoc),
          sources: getSources(videoDoc)
        });
      }

      // Even if the first document proxies another, keep this alternativeText
      const alternativeText = videoDocOrVideoProxyDoc.title;
      const isVideoProxyDoc = !!videoDocOrVideoProxyDoc.target;

      if (!isVideoProxyDoc) {
        return parseMetadata(videoDocOrVideoProxyDoc);
      }

      terminusFetch({ id: videoDocOrVideoProxyDoc.target.id, type: 'video' })
        .then(videoDoc => parseMetadata(videoDoc))
        .catch(err => done(err));
    })
    .catch(err => done(err));
};

export const hasAudio = el => {
  return el.mozHasAudio || !!el.webkitAudioDecodedByteCount || !!(el.audioTracks && el.audioTracks.length);
};
