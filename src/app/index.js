// External
const html = require('bel');

// Ours
const { SELECTORS, RICHTEXT_BLOCK_TAGNAMES } = require('../constants');
const api = require('./api');
const Caption = require('./components/Caption');
const Comments = require('./components/Comments');
const Block = require('./components/Block');
const Gallery = require('./components/Gallery');
const Header = require('./components/Header');
const ImageEmbed = require('./components/ImageEmbed');
const MasterGallery = require('./components/MasterGallery');
const Nav = require('./components/Nav');
const Quote = require('./components/Quote');
const ScrollHint = require('./components/ScrollHint');
const Series = require('./components/Series');
const Share = require('./components/Share');
const UDropcap = require('./components/UDropcap');
const UQuote = require('./components/UQuote');
const UParallax = require('./components/UParallax');
const UPull = require('./components/UPull');
const VideoEmbed = require('./components/VideoEmbed');
const { enqueue, start, subscribe } = require('./scheduler');
const { getMeta } = require('./meta');
const { prepare, reset } = require('./reset');
const { getMarkers, getSections } = require('./utils/anchors');
const { $, $$, after, append, before, detach, detachAll, isElement, prepend, substitute } = require('./utils/dom');

function app() {
  prepare();

  const meta = getMeta();
  const storyEl = reset($(SELECTORS.STORY), meta);

  after($(SELECTORS.GLOBAL_NAV), Nav({ shareLinks: meta.shareLinks }));

  start(); // loop

  // Register all embedded images with MasterGallery
  $$('.inline-content.photo, [class*="view-image-embed"]', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-photo', el)))
    .forEach(MasterGallery.register);

  let hasHeader = false;

  // Transform sections
  getSections(['header', 'remove', 'block', 'gallery', 'mosaic', 'pull']).forEach(section => {
    switch (section.name) {
      case 'header':
        hasHeader = true;
        Header.transformSection(section, meta);
        break;
      case 'remove':
        detachAll([section.startNode, section.endNode].concat(section.betweenNodes));
        break;
      case 'block':
        Block.transformSection(section);
        break;
      case 'gallery':
      case 'mosaic':
        Gallery.transformSection(section);
        break;
      case 'pull':
        UPull.transformSection(section, meta);
        break;
      default:
        break;
    }
  });

  if (!hasHeader) {
    prepend(storyEl, Header({ meta }));
  }

  // Enable drop-caps after headers
  $$('.Header').forEach(el => {
    let nextEl = el.nextElementSibling;

    if (nextEl !== null && nextEl.tagName !== 'P') {
      nextEl = nextEl.nextElementSibling;
    }

    UDropcap.conditionallyApply(nextEl);
  });

  // Enable outdented quotes on direct descendants of richtext elements
  $$('[class*="u-richtext"] > *')
    .filter(el => RICHTEXT_BLOCK_TAGNAMES.indexOf(el.tagName) > -1)
    .forEach(UQuote.conditionallyApply);

  // Transform markers
  getMarkers(['cta', 'hr', 'scrollhint', 'series', 'share', 'video', 'youtube']).forEach(marker => {
    let el;

    switch (marker.name) {
      case 'cta':
        marker.node.nextElementSibling.classList.add('u-cta');
        detach(marker.node);
        break;
      case 'hr':
        el = html`<hr>`;
        marker.substituteWith(el);
        UDropcap.conditionallyApply(el.nextElementSibling);
        break;
      case 'scrollhint':
        ScrollHint.transformMarker(marker);
        break;
      case 'series':
        Series.transformMarker(marker);
        break;
      case 'share':
        Share.transformMarker(marker, meta.shareLinks);
        break;
      case 'video':
      case 'youtube':
        VideoEmbed.transformMarker(marker);
        break;
      default:
        break;
    }
  });

  // Activate existing parallaxes
  $$('.u-parallax').forEach(UParallax.activate);

  // Transform image embeds
  const sidePulls = $$('.u-pull-left, .u-pull-right');

  $$('.inline-content.photo, [class*="view-image-embed"]', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-photo', el)))
    .forEach(el => {
      const isSidePulled = sidePulls.filter(pEl => pEl.contains(el)).length > 0;

      ImageEmbed.transformEl(el, isSidePulled);
    });

  // Transform video embeds
  $$('.inline-content.video, .view-inlineMediaPlayer', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-video', el)))
    .forEach(VideoEmbed.transformEl);

  // Transform quotes (native and embedded)
  $$(
    'blockquote:not([class]), .quote--pullquote, .inline-content.quote, .embed-quote, .comp-rich-text-blockquote, .view-inline-pullquote',
    storyEl
  ).forEach(Quote.transformEl);

  // Nullify nested pulls (outer always wins)
  $$('[class*="u-pull"] [class*="u-pull"]').forEach(
    el => (el.className = el.className.replace(/u-pull(-\w+)?/, 'n-pull$1'))
  );

  // Transform embedded external link captions
  let eels = $$('.inline-content[class*="embed"]', storyEl).concat(
    $$('.embed-content', storyEl).filter(el => $('.type-external', el))
  );

  (function transformRemainingEELs() {
    eels = eels.reduce((memo, el) => {
      if (el.className.indexOf(' embedded') > -1 || $('.embedded', el)) {
        const captionEl = Caption.createFromEl(el);
        const originalCaptionEl = $('.embed-caption, .inline-caption, a', el);

        if (captionEl && originalCaptionEl) {
          substitute(originalCaptionEl, captionEl);
        }
      } else {
        memo.push(el);
      }

      return memo;
    }, []);

    if (eels.length > 0) {
      setTimeout(transformRemainingEELs, 500);
    }
  })();

  // Embed comments, if enabled
  if (meta.hasCommentsEnabled) {
    append(storyEl, Comments());
  }

  // Embed master gallery
  append(storyEl, MasterGallery());

  // Allow garbage collection
  delete meta.bylineNodes;

  // Expose API, then notify interested parties
  window.__ODYSSEY__ = api;
  window.dispatchEvent(new CustomEvent('odyssey:api', { detail: api }));

  // Notify console of deprecated anchors
  setTimeout(() => {
    const deprecated = {};

    getMarkers(['image', 'video', 'cover', 'gallerytiled']).forEach(marker => (deprecated[`#${marker.name}`] = true));

    const keys = Object.keys(deprecated);

    if (keys.length) {
      console.debug(`[Odyssey] Deprecated anchors used: ${Object.keys(deprecated).join(', ')}`);
    }
  }, 5000);
}

module.exports = app;
