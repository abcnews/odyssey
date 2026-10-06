// @ts-check
import { getMeta } from '../../meta';
import { getOrFetchDocument } from '../../utils/content';

/**
 * @typedef {{alternativeText?: string; caption?: string; attribution?: string; posterURL?: string; sources: VideoSource[]}} VideoMetadata
 */

const NO_CMID_ERROR = 'No CMID available for video';

/**
 * @param {TerminusVideo|EmbeddedVideo} videoDoc
 */
const getPosterURL = videoDoc => {
  try {
    return videoDoc.media?.image?.poster.images['16x9'];
  } catch (e) {
    return undefined;
  }
};

/**
 * @param {TerminusVideo | EmbeddedVideo} videoDoc
 */
const getSources = videoDoc => [...videoDoc.media.video.renditions.files].sort((a, b) => a.size - b.size);

/**
 * Get metadata for a video
 * @param {string|number} videoId The CMID for the video
 * @returns {Promise<VideoMetadata>}
 */
export const getMetadata = videoId => {
  return new Promise((resolve, reject) => {
    if (!videoId) {
      return reject(new Error(NO_CMID_ERROR));
    }

    const meta = getMeta();

    getOrFetchDocument({ id: String(videoId), type: 'video' }, meta)
      .then(videoDocOrTeaserDoc => {
        // If the doc is a teaser, we need to fetch & parse the target document
        if (videoDocOrTeaserDoc.docType === 'Teaser') {
          if (!videoDocOrTeaserDoc.target) {
            throw new Error('Embedded video teaser has no target.');
          }

          return getOrFetchDocument({ id: videoDocOrTeaserDoc.target.id, type: 'video' }, meta)
            .then(videoDoc => {
              if (videoDoc.docType === 'Video') {
                const alternativeText =
                  videoDocOrTeaserDoc._embedded?.mediaThumbnail?.alt || videoDoc._embedded?.mediaThumbnail?.alt;
                const caption = videoDoc.caption;
                const attribution = videoDocOrTeaserDoc.byLine?.plain || videoDoc.byLine?.plain;
                resolve({
                  alternativeText,
                  caption,
                  attribution,
                  posterURL: getPosterURL(videoDoc),
                  sources: getSources(videoDoc)
                });
              } else {
                throw new Error('Teaser points to a non-video document.');
              }
            })
            .catch(err => reject(err));
        } else if (videoDocOrTeaserDoc.docType === 'Video') {
          // This is a video document so use directly.
          const alternativeText = videoDocOrTeaserDoc._embedded?.mediaThumbnail?.alt;
          const caption = videoDocOrTeaserDoc.caption;
          const attribution = videoDocOrTeaserDoc.byLine?.plain;
          return resolve({
            alternativeText,
            caption,
            attribution,
            posterURL: getPosterURL(videoDocOrTeaserDoc),
            sources: getSources(videoDocOrTeaserDoc)
          });
        }

        throw new Error('Not a video or teaser document.');
      })
      .catch(err => reject(err));
  });
};

/**
 * Check if a video has audio attached.
 * @param {HTMLVideoElement} el
 * @returns {boolean}
 */
export const hasAudio = el => {
  return (
    // @ts-expect-error Non-standard attribute
    el.mozHasAudio ||
    // @ts-expect-error Non-standard attribute
    !!el.webkitAudioDecodedByteCount ||
    // @ts-expect-error Standard attribute but not adopted widely by browsers
    !!(el.audioTracks && el.audioTracks.length)
  );
};
