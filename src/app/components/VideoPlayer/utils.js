// @ts-check
import { getMeta } from '../../meta';
import { getOrFetchDocument } from '../../utils/content';

/**
 * @typedef {{width: number; height: number; url: string}} VideoSource

/**
 * @typedef {{alternativeText: string; posterURL: string; sources: VideoSource[]}} VideoMetadata
 */

const NO_CMID_ERROR = 'No CMID available for video';

const getPosterURL = videoDoc => {
  try {
    return videoDoc.media.image ? videoDoc.media.image.poster.images['16x9'] : null;
  } catch (e) {
    return null;
  }
};

const getSources = videoDoc => [...videoDoc.media.video.renditions.files].sort((a, b) => a.size - b.size);

/**
 * Get metadata for a video
 * @param {string|number} videoId The CMID for the video
 * @returns {Promise<VideoMetadata>}
 */
export const getMetadata = videoId =>
  new Promise((resolve, reject) => {
    if (!videoId) {
      return reject(new Error(NO_CMID_ERROR));
    }

    const meta = getMeta();

    getOrFetchDocument({ id: String(videoId), type: 'video' }, meta)
      .then(videoDocOrTeaserDoc => {
        // Keep the alt text from the title of the teaser doc (if exists).
        // Otherwise return the alt text from the thumbnail image.
        const alternativeText = videoDocOrTeaserDoc?._embedded?.mediaThumbnail?.alt || videoDocOrTeaserDoc.title;

        if (videoDocOrTeaserDoc.target) {
          // We need to fetch & parse the (teased) target document
          return getOrFetchDocument({ id: videoDocOrTeaserDoc.target.id, type: 'video' }, meta)
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
