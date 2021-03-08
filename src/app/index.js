// External
const html = require('bel');

// Ours

const { RICHTEXT_BLOCK_TAGNAMES, SELECTORS } = require('../constants');
const api = require('./api');
const { PresentationLayerAsyncComponent } = require('./async-components/loader');
const Backdrop = require('./components/Backdrop');
const Block = require('./components/Block');
const Caption = require('./components/Caption');
const Comments = require('./components/Comments');
const FormatCredit = require('./components/FormatCredit');
const Gallery = require('./components/Gallery');
const GalleryEmbed = require('./components/GalleryEmbed');
const Header = require('./components/Header');
const ImageEmbed = require('./components/ImageEmbed');
const MasterGallery = require('./components/MasterGallery');
const Picture = require('./components/Picture');
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
const { start, subscribe } = require('./scheduler');
const { initMeta } = require('./meta');
const { reset } = require('./reset');
const { $, $$, after, append, before, detach, detachAll, prepend, substitute } = require('./utils/dom');
const { getMarkers, getSections } = require('./utils/mounts');

function app(terminusDocument) {
  const meta = initMeta(terminusDocument);
  const storyEl = reset($(SELECTORS.STORY), meta);

  start(); // loop

  // Register all embedded images with MasterGallery
  meta.images.forEach(image => MasterGallery.register(image));

  let hasHeader = false;

  // Transform sections
  // - First, #remove/#endremove should be processed, so that other sections
  //   don't have the opportunity to make references to their nodes
  // - Next, #backdrop/#endbackdrop should be processed, as other sections may
  //   nested inside them
  // - Finally, all other sections (which shouldn't nest each other) can safely
  //   be transformed
  getSections(['remove']).forEach(section => detachAll([section.startNode, ...section.betweenNodes, section.endNode]));
  getSections(['backdrop']).forEach(section => Backdrop.transformSection(section));
  getSections(['header', 'block', 'gallery', 'mosaic', 'pull']).forEach(section => {
    switch (section.name) {
      case 'header':
        hasHeader = true;
        Header.transformSection(section, meta);
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
        el = html`<hr />`;
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
    .concat(
      $$('[data-component="Figure"]', storyEl).filter(el =>
        $('[data-component="PlayerButton"][aria-label*="Video"]', el)
      )
    )
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
    .concat(
      $$('[data-component="Figure"]', storyEl).filter(
        el => (el.getAttribute('data-uri') || '').indexOf('customimage') === -1 && $('img', el)
      )
    )
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

  // Restore thumbnail images in PL recirculation
  $$('[data-component="Decoy"][data-key="body"] [data-component="IntersectionObserver"]').forEach(el => {
    const imgEl = $('img', el);
    const src = imgEl && imgEl.getAttribute('data-src');

    if (src) {
      substitute(
        el,
        Picture({
          src,
          preserveOriginalRatio: true
        })
      );
    }
  });

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
    if (!meta.isPL && !$('[data-component="Masthead"]')) {
      before(storyEl, PresentationLayerAsyncComponent('Nav'));
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

    if (meta.isPreview && blockEls.length) {
      console.debug(`[Odyssey] Fixed classNames of deprecated scrollyteller Blocks`);
    }
  }, 2000);

  // Notify console of deprecated mounts
  setTimeout(() => {
    const deprecated = {};

    getMarkers(['image', 'video', 'cover', 'gallerytiled']).forEach(marker => (deprecated[`#${marker.name}`] = true));

    const keys = Object.keys(deprecated);

    if (meta.isPreview && keys.length) {
      console.debug(`[Odyssey] Deprecated mounts used: ${Object.keys(deprecated).join(', ')}`);
    }
  }, 5000);

  // Fix preview tools's PL preview areas
  // * Limit PL iframe heights to 100%
  // * Enable/disable the desktop iframe scrolling when it is/isn't 100% in view
  if (meta.isPreview) {
    let desktopPreviewAreaEl;
    let desktopPreviewIframeEl;
    let isScrollable = false;

    function updateScrollable() {
      const { top } = desktopPreviewAreaEl.getBoundingClientRect();
      const shouldBeScrollable = top <= 0;

      if (isScrollable !== shouldBeScrollable) {
        desktopPreviewIframeEl.setAttribute('scrolling', shouldBeScrollable ? 'yes' : 'no');

        isScrollable = shouldBeScrollable;
      }

      if (shouldBeScrollable) {
        window.scrollTo(window.scrollX, window.scrollY + top);
      }
    }

    function fixIframes() {
      const styleEl = document.createElement('style');

      styleEl.appendChild(document.createTextNode(`#iframe-pl,#iframe-pl-desktop{height:100% !important;}`));
      document.head.appendChild(styleEl);
      desktopPreviewIframeEl = desktopPreviewAreaEl.querySelector('iframe');

      document.getElementById('iframe-app').setAttribute('scrolling', 'yes');
      document.getElementById('iframe-pl').setAttribute('scrolling', 'yes');
      updateScrollable();
      subscribe(updateScrollable);
      document.querySelector('button[data-preview-desktop]').addEventListener('click', updateScrollable);
    }

    (function fixIframesAfterPreviewToolsLoaded() {
      desktopPreviewAreaEl = document.querySelector('.section-desktop-preview-area');
      desktopPreviewAreaEl ? fixIframes() : setTimeout(fixIframesAfterPreviewToolsLoaded, 9);
    })();
  }
}

module.exports = app;
