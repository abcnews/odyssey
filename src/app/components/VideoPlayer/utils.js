// External
const { terminusFetch } = require('../../utils/content');

const NO_CMID_ERROR = 'No CMID available for video';

function pickImageURL(images) {
  return (images.filter(image => image.ratio === '16x9').sort((a, b) => b.size - a.size)[0] || {}).url;
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

function getMetadata(videoId, done) {
  if (!videoId) {
    return done(new Error(NO_CMID_ERROR));
  }

  terminusFetch({ id: videoId, type: 'video' }, (err, item) => {
    if (err) {
      return done(err);
    }

    done(null, {
      alternativeText: item.title,
      posterURL:
        item._embedded && item._embedded.mediaThumbnail ? pickImageURL(item._embedded.mediaThumbnail.complete) : null,
      sources: getSources(item)
    });
  });
}

function hasAudio(el) {
  return el.mozHasAudio || !!el.webkitAudioDecodedByteCount || !!(el.audioTracks && el.audioTracks.length);
}

module.exports.getMetadata = getMetadata;
module.exports.hasAudio = hasAudio;
