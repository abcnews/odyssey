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
export const getMetadata = async videoId => {
  if (!videoId) {
    throw new Error(NO_CMID_ERROR);
  }

  const meta = getMeta();

  const { videoDoc, teaserDoc } = await getOrFetchDocument({ id: String(videoId), type: 'video' }, meta).then(
    async videoDocOrTeaserDoc => {
      if (videoDocOrTeaserDoc.docType === 'Teaser' && videoDocOrTeaserDoc.target) {
        const videoDoc = await getOrFetchDocument({ id: videoDocOrTeaserDoc.target.id, type: 'video' }, meta);
        if (videoDoc.docType !== 'Video') {
          throw new Error('Teaser targets a non-video document.');
        }
        return { videoDoc, teaserDoc: videoDocOrTeaserDoc };
      }
      if (videoDocOrTeaserDoc.docType === 'Video') {
        return { videoDoc: videoDocOrTeaserDoc, teaserDoc: undefined };
      }
      throw new Error('Not a video or teaser document.');
    }
  );

  return {
    alternativeText: teaserDoc?._embedded?.mediaThumbnail?.alt || videoDoc._embedded?.mediaThumbnail?.alt,
    caption: videoDoc.caption,
    attribution: teaserDoc?.byLine?.plain || videoDoc.byLine?.plain,
    posterURL: getPosterURL(videoDoc),
    sources: getSources(videoDoc)
  };
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
