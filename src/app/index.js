// External
const html = require('bel');

// Ours

const { IS_PREVIEW, RICHTEXT_BLOCK_TAGNAMES, SELECTORS } = require('../constants');
const api = require('./api');
const { PresentationLayerAsyncComponent } = require('./async-components/loader');
const Block = require('./components/Block');
const Caption = require('./components/Caption');
const Comments = require('./components/Comments');
const FormatCredit = require('./components/FormatCredit');
const Gallery = require('./components/Gallery');
const GalleryEmbed = require('./components/GalleryEmbed');
const Header = require('./components/Header');
const ImageEmbed = require('./components/ImageEmbed');
const MasterGallery = require('./components/MasterGallery');
const Quote = require('./components/Quote');
const Recirculation = require('./components/Recirculation');
const ScrollHint = require('./components/ScrollHint');
const Series = require('./components/Series');
const Share = require('./components/Share');
const StoryTeaserEmbed = require('./components/StoryTeaserEmbed');
const UDropcap = require('./components/UDropcap');
const UQuote = require('./components/UQuote');
const UParallax = require('./components/UParallax');
const UPull = require('./components/UPull');
const VideoEmbed = require('./components/VideoEmbed');
const WhatNext = require('./components/WhatNext');
const { start } = require('./scheduler');
const { getMeta } = require('./meta');
const { reset } = require('./reset');
const { getMarkers, getSections } = require('./utils/anchors');
const { $, $$, after, append, detach, detachAll, prepend, substitute } = require('./utils/dom');

function app() {
  const meta = getMeta();
  const storyEl = reset($(SELECTORS.STORY), meta);

  start(); // loop

  // Register all embedded images with MasterGallery
  $$('.inline-content.photo,[class*="view-image-embed"]', storyEl)
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
    prepend(storyEl, Header.Lite(meta));
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
  getMarkers([
    'cta',
    'hr',
    'scrollhint',
    'series',
    'share',
    'video',
    'youtube',
    'related',
    'tease',
    'whatnext'
  ]).forEach(marker => {
    let el;

    switch (marker.name) {
      case 'cta':
        marker.node.nextElementSibling.classList.add('u-cta');
        detach(marker.node);
        break;
      case 'hr':
        el = html`
          <hr />
        `;
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
      case 'related':
      case 'tease':
        Recirculation.transformMarker(marker, meta);
        break;
      case 'whatnext':
        WhatNext.transformMarker(marker);
        break;
      default:
        break;
    }
  });

  // Activate existing parallaxes
  $$('.u-parallax').forEach(UParallax.activate);

  // Transform video embeds
  $$('.inline-content.video, .view-inlineMediaPlayer.doctype-abcvideo', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-video', el)))
    .forEach(VideoEmbed.transformEl);

  // Transform gallery embeds
  $$('.inline-content.gallery', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-gallery', el)))
    .concat($$('[class^="comp-embedded-"]', storyEl).filter(el => $('[data-gallery-id]', el)))
    .forEach(GalleryEmbed.transformEl);

  // Transform image embeds
  const sidePulls = $$('.u-pull-left, .u-pull-right');

  $$('.inline-content.photo,[class*="view-image-embed"]', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-photo', el)))
    .forEach(el => {
      const isSidePulled = sidePulls.filter(pEl => pEl.contains(el)).length > 0;

      ImageEmbed.transformEl(el, isSidePulled);
    });

  // Transform quotes (native and embedded) that haven't already been transformed
  $$(SELECTORS.QUOTE, storyEl)
    .filter(el => el.closest('.Quote') === null)
    .forEach(Quote.transformEl);

  // Nullify nested pulls (outer always wins)
  $$('[class*="u-pull"] [class*="u-pull"]').forEach(
    el => (el.className = el.className.replace(/u-pull(-\w+)?/, 'n-pull$1'))
  );

  // Transform WYSIWYG story teasers (title+image+description convention)
  $$(SELECTORS.WYSIWYG_EMBED, storyEl)
    .filter(StoryTeaserEmbed.doesElMatchConvention)
    .forEach(StoryTeaserEmbed.transformEl);

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

  // Embed format credit for non-DSI stories
  if (meta.productionUnit !== 'EDL team' && (meta.infoSource || {}).name !== 'Digital Story Innovation Team') {
    append(storyEl, FormatCredit());
  }

  // Embed comments, if enabled
  if (meta.hasCommentsEnabled) {
    append(storyEl, Comments());
  }

  // Embed master gallery
  append(storyEl, MasterGallery());

  // Allow garbage collection
  delete meta.bylineNodes;

  // Expose API, then notify interested parties
  Object.defineProperty(window, '__ODYSSEY__', { value: api });
  window.dispatchEvent(new CustomEvent('odyssey:api', { detail: api }));

  // Add Presentation Layer global nav if it doesn't already exist
  setTimeout(() => {
    if (!$('[data-component="Masthead"]')) {
      after($(SELECTORS.GLOBAL_NAV), PresentationLayerAsyncComponent('Nav'));
    }
  }, 0);

  // Fix Block classNames on non-updated scrollyteller instances.
  // Stories which depend on this polyfill are tracked here:
  // https://github.com/abcnews/odyssey/pull/64#issuecomment-444763314
  setTimeout(() => {
    const alignmentPattern = /\sis-(left|right)/;
    const blockEls = $$('.Block.is-richtext');

    blockEls.forEach(el => {
      const [, alignment] = el.className.match(alignmentPattern) || [];

      el.className = el.className.replace(' is-richtext', '');

      if (alignment) {
        el.className = `${el.className} has-${alignment}`;
      }

      $$('.Block-content', el).forEach(el => {
        el.className = el.className.replace(' u-layout', '');

        if (alignment && !el.className.match(alignmentPattern)) {
          el.className = `${el.className} is-${alignment}`;
        }
      });
    });

    if (IS_PREVIEW && blockEls.length) {
      console.debug(`[Odyssey] Fixed classNames of deprecated scrollyteller Blocks`);
    }
  }, 2000);

  // Notify console of deprecated anchors
  setTimeout(() => {
    const deprecated = {};

    getMarkers(['image', 'video', 'cover', 'gallerytiled']).forEach(marker => (deprecated[`#${marker.name}`] = true));

    const keys = Object.keys(deprecated);

    if (IS_PREVIEW && keys.length) {
      console.debug(`[Odyssey] Deprecated anchors used: ${Object.keys(deprecated).join(', ')}`);
    }
  }, 5000);
}

module.exports = app;
