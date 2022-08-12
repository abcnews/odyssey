import { getOrFetchDocument } from '../../utils/content';

const NO_CMID_ERROR = 'No CMID available for video';

const getPosterURL = videoDoc => {
  try {
    return videoDoc.media.image ? videoDoc.media.image.poster.images['16x9'] : null;
  } catch (e) {
    return null;
  }
};

const getSources = videoDoc => [...videoDoc.media.video.renditions.files].sort((a, b) => a.size - b.size);

export const getMetadata = videoId =>
  new Promise((resolve, reject) => {
    if (!videoId) {
      return reject(new Error(NO_CMID_ERROR));
    }

    getOrFetchDocument({ id: videoId, type: 'video' })
      .then(videoDocOrTeaserDoc => {
        // Even if the first document teases another, keep this alternativeText
        const alternativeText = videoDocOrTeaserDoc.title;

        if (videoDocOrTeaserDoc.target) {
          // We need to fetch & parse the (teased) target document
          return getOrFetchDocument({ id: videoDocOrTeaserDoc.target.id, type: 'video' })
            .then(videoDoc =>
              resolve({
                alternativeText,
                posterURL: getPosterURL(videoDoc),
                sources: getSources(videoDoc)
              })
            )
            .catch(err => reject(err));
        }

        // We can parse this document
        return resolve({
          alternativeText,
          posterURL: getPosterURL(videoDocOrTeaserDoc),
          sources: getSources(videoDocOrTeaserDoc)
        });
      })
      .catch(err => reject(err));
  });

export const hasAudio = el => {
  return el.mozHasAudio || !!el.webkitAudioDecodedByteCount || !!(el.audioTracks && el.audioTracks.length);
};
