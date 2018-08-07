// External
const raf = require('raf');
const xhr = require('xhr');

// Ours
const { CSS_URL } = require('../../../constants');
const { getMeta } = require('../../meta');
const { $, $$, isElement } = require('../../utils/dom');

const NEWLINES_PATTERN = /[\n\r]/g;
const ERROR_UNRECOGNISED = 'Unrecognised video detail page template';

function formatSources(sources, sortProp = 'bitrate') {
  return sources.sort((a, b) => +b[sortProp] - +a[sortProp]).map(source => ({
    src: source.src || source.url,
    type: source.type || source.contentType,
    width: +source.width || 0,
    height: +source.height || 0
  }));
}

function getMetadata(videoElOrId, callback) {
  let wasCalled;

  function done(err, metadata) {
    if (!wasCalled) {
      wasCalled = true;
      raf(() => {
        callback(err, metadata);
      });
    }
  }

  if (isElement(videoElOrId)) {
    if (videoElOrId.className.indexOf('jw-') > -1) {
      // JWPLayer <video> with src attribute and nearby element with poster as a background-image
      done(null, {
        posterURL: (videoElOrId.parentElement.nextElementSibling.style.backgroundImage.match(CSS_URL) || [, ''])[1],
        sources: formatSources([videoElOrId])
      });
    } else {
      // <video> with poster attribute and <source> children
      done(null, {
        posterURL: videoElOrId.poster,
        sources: formatSources($$('source', videoElOrId))
      });
    }
  } else if ('WCMS' in window) {
    // Phase 2
    // * Poster & sources are nested inside global `WCMS` object

    Object.keys(WCMS.pluginCache.plugins.videoplayer).some(key => {
      const config = WCMS.pluginCache.plugins.videoplayer[key][0].videos[0];

      if (config.url.indexOf(videoElOrId) > -1) {
        done(null, {
          posterURL: config.thumbnail.replace('-thumbnail', '-large'),
          sources: formatSources(config.sources, 'label')
        });

        return true;
      }
    });
  } else if ('inlineVideoData' in window) {
    // Phase 1 (Standard)
    // * Poster may be inferred from original embed's partial jwplayer transform
    // * Sources are nested inside global `inlineVideoData` object

    const relatedMedia = getMeta().relatedMedia;

    $$('.inline-content.video[data-inline-video-data-index]')
      .concat(relatedMedia ? [relatedMedia] : [])
      .some(el => {
        if ($(`[href*="/${videoElOrId}"]`, el)) {
          const posterEl = $('img', el) || $('.inline-video, .jwplayer-video', el);

          done(null, {
            posterURL: posterEl ? (posterEl.style.backgroundImage.match(CSS_URL) || [, posterEl.src])[1] : null,
            sources: formatSources(window.inlineVideoData[el.getAttribute('data-inline-video-data-index')])
          });

          return true;
        }
      });
  } else {
    // Phase 1 (Mobile):
    // * Doesn't embed video; only teases to it.
    // * Must fetch video detail page (Phase 1 always fetches from Standard)...
    // * ...then parse posterURL and sources, based on the page template

    getMetadataFromDetailPage(videoElOrId, done);
  }
}

function detailPageURLFromId(id) {
  return `${(window.location.origin || '').replace('mobile', 'www')}/news/${id}?pfm=ms`;
}

function getMetadataFromDetailPage(id, callback) {
  xhr({ url: detailPageURLFromId(id) }, (err, response, body) => {
    if (err || response.statusCode !== 200) {
      return callback(err || new Error(response.statusCode));
    }

    const doc = new DOMParser().parseFromString(body, 'text/html');

    if (body.indexOf('WCMS.pluginCache') > -1) {
      // Phase 2
      // * Poster can be selected from the DOM
      // * Sources can be parsed from JS that would nest them under the global `WCMS` object

      const imgEl = doc.querySelector('.view-inlineMediaPlayer img');

      return callback(null, {
        posterURL: imgEl.getAttribute('src').replace('-thumbnail', '-large'),
        alternativeText: imgEl.getAttribute('alt'),
        sources: formatSources(
          JSON.parse(body.replace(NEWLINES_PATTERN, '').match(/"sources":(\[.*\]),"addDownload"/)[1])
        )
      });
    } else if (body.indexOf('inlineVideoData') > -1) {
      // Phase 1 (Standard)
      // * Poster can be selected from the DOM
      // * Sources can be parsed from JS that would nest them under the global `inlineVideoData` object

      const imgEl = doc.querySelector('.inline-video img');

      return callback(null, {
        posterURL: imgEl.getAttribute('src'),
        alternativeText: imgEl.getAttribute('alt'),
        sources: formatSources(
          JSON.parse(
            body
              .replace(NEWLINES_PATTERN, '')
              .match(/inlineVideoData\.push\((\[.*\])\)/)[1]
              .replace(/'/g, '"')
          )
        )
      });
    }

    callback(new Error(ERROR_UNRECOGNISED));
  });
}

function hasAudio(el) {
  return el.mozHasAudio || !!el.webkitAudioDecodedByteCount || !!(el.audioTracks && el.audioTracks.length);
}

module.exports.getMetadata = getMetadata;
module.exports.getMetadataFromDetailPage = getMetadataFromDetailPage;
module.exports.hasAudio = hasAudio;
