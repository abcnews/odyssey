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
const { mockDecoyActivationsUnderEl } = require('./utils/decoys');
const { $, $$, after, append, before, detach, detachAll, prepend, substitute } = require('./utils/dom');
const { conditionalDebug, debug } = require('./utils/logging');
const { getMarkers, getSections } = require('./utils/mounts');

function app(terminusDocument) {
  const meta = initMeta(terminusDocument);
  let storyEl = $(meta.isPL ? SELECTORS.PL_STORY : SELECTORS.STORY);

  if (!storyEl) {
    debug('Story is empty. Nothing to do');
    return;
  }

  storyEl = reset(storyEl, meta);
  debug('Performed page reset');

  mockDecoyActivationsUnderEl(storyEl); // Mock PL's decoy activation events
  start(); // scheduler loop

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
  const transformedSections = {};
  const trackTransformedSection = section => {
    if (!(section.name in transformedSections)) {
      transformedSections[section.name] = [];
    }

    transformedSections[section.name].push(section.startNode);
  };

  getSections(['remove']).forEach(section => {
    detachAll([section.startNode, ...section.betweenNodes, section.endNode]);
    trackTransformedSection(section);
  });
  getSections(['backdrop']).forEach(section => {
    Backdrop.transformSection(section);
    trackTransformedSection(section);
  });
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

    trackTransformedSection(section);
  });
  debug(`Transformed sections (${Object.keys(transformedSections).length})`, transformedSections);

  if (!hasHeader) {
    prepend(storyEl, Header.Lite(meta));
    debug('No #header/#endheader mount points found. Inserted lite header');
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
  debug('Applied quote-mark formatting to qualifying elements');

  // Transform markers
  const transformedMarkers = {};
  const trackTransformedMarker = marker => {
    if (!(marker.name in transformedMarkers)) {
      transformedMarkers[marker.name] = [];
    }

    transformedMarkers[marker.name].push(marker.node);
  };

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

    trackTransformedMarker(marker);
  });
  debug(`Transformed markers (${Object.keys(transformedMarkers).length})`, transformedMarkers);

  // Activate existing parallaxes
  const parallaxes = $$('.u-parallax');
  parallaxes.forEach(UParallax.activate);
  conditionalDebug(parallaxes.length > 0, `Activated ${parallaxes.length} parallax effects`);

  // Transform video embeds
  const videoEmbeds = $$('.inline-content.video, .view-inlineMediaPlayer.doctype-abcvideo', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-video', el)))
    .concat(
      $$('[data-component="Figure"]', storyEl).filter(el =>
        $('[data-component="PlayerButton"][aria-label*="Video"]', el)
      )
    );
  videoEmbeds.forEach(VideoEmbed.transformEl);
  conditionalDebug(videoEmbeds.length > 0, `Transformed ${videoEmbeds.length} video embeds`);

  // Transform gallery embeds
  const galleryEmbeds = $$('.inline-content.gallery', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-gallery', el)))
    .concat($$('[class^="comp-embedded-"]', storyEl).filter(el => $('[data-gallery-id]', el)));
  galleryEmbeds.forEach(GalleryEmbed.transformEl);
  conditionalDebug(galleryEmbeds.length > 0, `Transformed ${galleryEmbeds.length} gallery embeds`);

  // Transform image embeds
  const sidePulls = $$('.u-pull-left, .u-pull-right');
  const imageEmbeds = $$('.inline-content.photo,[class*="view-image-embed"]', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-photo', el)))
    .concat(
      $$('[data-component="Figure"]', storyEl).filter(
        el => (el.getAttribute('data-uri') || '').indexOf('customimage') === -1 && $('img', el)
      )
    );
  imageEmbeds.forEach(el => {
    const isSidePulled = sidePulls.filter(pEl => pEl.contains(el)).length > 0;

    ImageEmbed.transformEl(el, isSidePulled);
  });
  conditionalDebug(imageEmbeds.length > 0, `Transformed ${imageEmbeds.length} image embeds`);

  // Transform quotes (native and embedded) that haven't already been transformed
  const nativeQuotesAndQuoteEmbeds = $$(SELECTORS.QUOTE, storyEl).filter(el => el.closest('.Quote') === null);
  nativeQuotesAndQuoteEmbeds.forEach(Quote.transformEl);
  conditionalDebug(
    nativeQuotesAndQuoteEmbeds.length > 0,
    `Transformed ${nativeQuotesAndQuoteEmbeds.length} native quotes / quote embeds`
  );

  // Nullify nested pulls (outer always wins)
  const nestedPulls = $$('[class*="u-pull"] [class*="u-pull"]');
  nestedPulls.forEach(el => (el.className = el.className.replace(/u-pull(-\w+)?/, 'n-pull$1')));
  conditionalDebug(nestedPulls.length > 0, `Nullified ${nativeQuotesAndQuoteEmbeds.length} nested pulls`);

  // Transform WYSIWYG story teasers (title+image+description convention)
  const wysiwygEmbeds = $$(SELECTORS.WYSIWYG_EMBED, storyEl).filter(StoryTeaserEmbed.doesElMatchConvention);
  wysiwygEmbeds.forEach(StoryTeaserEmbed.transformEl);
  conditionalDebug(wysiwygEmbeds.length > 0, `Transformed ${wysiwygEmbeds.length} WYSIWYG embeds`);

  // Restore thumbnail images in PL post-story content (recirculation)
  const postStoryThumbnails = $$(
    '[data-component="Decoy"][data-key="body"] [data-component="IntersectionObserver"]'
  ).filter(el => {
    const imgEl = $('img', el);
    return imgEl && imgEl.getAttribute('data-src');
  });
  postStoryThumbnails.forEach(el => {
    substitute(
      el,
      Picture({
        src: $('img', el).getAttribute('data-src'),
        ratios: {
          sm: '3x2',
          md: '3x2',
          lg: '3x2',
          xl: '3x2'
        }
      })
    );
  });
  conditionalDebug(
    postStoryThumbnails.length > 0,
    `Restored ${postStoryThumbnails.length} post-story image thumbnails`
  );

  // Append format credit for non-DSI stories
  if (meta.productionUnit !== 'EDL team' && (meta.infoSource || {}).name !== 'Digital Story Innovation Team') {
    append(storyEl, FormatCredit());
    debug('Appended Odyssey format credit');
  }

  // Append comments, if enabled
  if (meta.hasCommentsEnabled) {
    append(storyEl, Comments());
    debug('Appended comments');
  }

  // Append master gallery
  append(storyEl, MasterGallery());
  debug('Appended master gallery');

  // Allow garbage collection
  delete meta.bylineNodes;

  // Expose API, then notify interested parties
  Object.defineProperty(window, '__ODYSSEY__', { value: api });
  window.dispatchEvent(new CustomEvent('odyssey:api', { detail: api }));
  debug('Dispatched `odyssey:api` event');

  // Add Presentation Layer global nav if it doesn't already exist
  setTimeout(() => {
    if (!meta.isPL && !$('[data-component="Masthead"]')) {
      before(storyEl, PresentationLayerAsyncComponent('Nav'));
      debug('[async] Appended PL global nav to non-PL story');
    }
  }, 0);

  // Try to resolve Presentation Layer Interactive document-based embeds
  setTimeout(() => {
    if (meta.isPL) {
      let textDescriptor;

      try {
        textDescriptor = meta._articledetail.text.descriptor;
      } catch (err) {
        return console.error(err);
      }

      const interactives = textDescriptor.children.filter(({ type }) => type === 'interactive');
      const numInteractivesResolved = 0;
      interactives.forEach(({ props }) => {
        const containerEl = $(`[itemid="${props.embedURL}"]`);

        if (containerEl) {
          containerEl.className = 'u-pull';
          substitute(containerEl.firstElementChild, PresentationLayerAsyncComponent('Interactive', props));
          numInteractivesResolved++;
        }
      });

      conditionalDebug(
        interactives.length > 0,
        `[async] Resolved ${numInteractivesResolved}/${interactives.length} interactives`
      );
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

    if (blockEls.length) {
      debug(`[async] Fixed classNames of deprecated scrollyteller Blocks`);
    }
  }, 2000);

  // Notify console of deprecated mounts
  setTimeout(() => {
    const deprecated = {};

    getMarkers(['image', 'video', 'cover', 'gallerytiled']).forEach(marker => (deprecated[`#${marker.name}`] = true));

    const keys = Object.keys(deprecated);

    if (keys.length) {
      debug(`[async] Deprecated mounts used: ${Object.keys(deprecated).join(', ')}`);
    }
  }, 5000);

  // Fix CM5 preview tools's PL preview areas
  // * Limit PL iframe heights to 100%
  // * Enable/disable the desktop iframe scrolling when it is/isn't 100% in view
  if (!meta.isPL && meta.isPreview) {
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
      $('button[data-preview-desktop]').addEventListener('click', updateScrollable);
    }

    (function fixIframesAfterPreviewToolsLoaded() {
      desktopPreviewAreaEl = $('.section-desktop-preview-area');
      desktopPreviewAreaEl ? fixIframes() : setTimeout(fixIframesAfterPreviewToolsLoaded, 9);
    })();
  }
}

module.exports = app;
