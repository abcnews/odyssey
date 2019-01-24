// External
const capiFetch = require('@abcnews/capi-fetch').default;

const NO_CMID_ERROR = 'No CMID available for video';

function pickImageURL(media) {
  return (media.filter(thumbnail => thumbnail.ratio === '16x9').sort((a, b) => b.size - a.size)[0] || {}).url;
}

function getPosterURL(item, done) {
  if (item.thumbnailLink) {
    return done(pickImageURL(item.thumbnailLink.media));
  }

  if (item.relatedItems) {
    const relatedImage = item.relatedItems.filter(relatedItem => relatedItem.docType === 'Image')[0];

    if (relatedImage) {
      // Must fetch image to get renditions. Allowed to fail.
      return capiFetch(relatedImage.id, (err, item) => {
        done(item ? pickImageURL(item.media) : null);
      });
    }
  }

  done();
}

function getSources(item, sortProp = 'bitrate') {
  return item.renditions
    .sort((a, b) => +b[sortProp] - +a[sortProp])
    .map(rendition => ({
      src: rendition.src || rendition.url,
      type: rendition.type || rendition.contentType,
      width: +rendition.width || 0,
      height: +rendition.height || 0
    }));
}

function getMetadata(videoId, done) {
  if (!videoId) {
    return done(new Error(NO_CMID_ERROR));
  }

  capiFetch(videoId, (err, item) => {
    if (err) {
      return done(err);
    }

    getPosterURL(item, posterURL =>
      done(null, {
        alternativeText: item.title,
        posterURL,
        sources: getSources(item)
      })
    );
  });
}

function hasAudio(el) {
  return el.mozHasAudio || !!el.webkitAudioDecodedByteCount || !!(el.audioTracks && el.audioTracks.length);
}

module.exports.getMetadata = getMetadata;
module.exports.hasAudio = hasAudio;
