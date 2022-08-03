import { MOCK_ELEMENT, RICHTEXT_BLOCK_TAGNAMES, SELECTORS } from '../constants';
import api from './api';
import { PresentationLayerAsyncComponent } from './async-components/loader';
import { transformSection as transformSectionIntoBackdrop } from './components/Backdrop';
import { transformSection as transformSectionIntoBlock } from './components/Block';
import Comments from './components/Comments';
import FormatCredit from './components/FormatCredit';
import { transformSection as transformSectionIntoGallery } from './components/Gallery';
import { transformElement as transformElementIntoGalleryEmbed } from './components/GalleryEmbed';
import { Lite as LiteHeader, transformSection as transformSectionIntoHeader } from './components/Header';
import { transformMarker as transformMarkerIntoHR } from './components/HR';
import { transformElement as transformElementIntoImageEmbed } from './components/ImageEmbed';
import MasterGallery, { register as registerWithMasterGallery } from './components/MasterGallery';
import Picture from './components/Picture';
import { transformElement as transformElementIntoQuote } from './components/Quote';
import { transformMarker as transformMarkerIntoRecirculation } from './components/Recirculation';
import { transformMarker as transformMarkerIntoScrollHint } from './components/ScrollHint';
import { transformMarker as transformMarkerIntoSeries } from './components/Series';
import { transformMarker as transformMarkerIntoShare } from './components/Share';
import {
  doesElMatchConvention as doesElMatchConventionOfStoryTeaserEmbed,
  transformElement as transformElementIntoStoryTeaserEmbed
} from './components/StoryTeaserEmbed';
import { transformMarker as transformMarkerIntoUCTA } from './components/UCTA';
import { conditionallyApply as conditionallyApplyUDropcap } from './components/UDropcap';
import { conditionallyApply as conditionallyApplyUQuote } from './components/UQuote';
import { activate as activateUParallax } from './components/UParallax';
import { transformSection as transformSectionIntoUPull } from './components/UPull';
import {
  transformElement as transformElementIntoVideoEmbed,
  transformMarker as transformMarkerIntoVideoEmbed
} from './components/VideoEmbed';
import { transformMarker as transformMarkerIntoWhatNext } from './components/WhatNext';
import { start, subscribe } from './scheduler';
import { initMeta } from './meta';
import { reset } from './reset';
import { mockDecoyActivationsUnderEl } from './utils/decoys';
import { $, $$, after, append, before, detachAll, prepend, substitute } from './utils/dom';
import { conditionalDebug, debug } from './utils/logging';
import { getMarkers, getSections } from './utils/mounts';

export default terminusDocument => {
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
  meta.images.forEach(image => registerWithMasterGallery(image));

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
    transformSectionIntoBackdrop(section);
    trackTransformedSection(section);
  });
  getSections(['header', 'block', 'gallery', 'mosaic', 'pull']).forEach(section => {
    switch (section.name) {
      case 'header':
        hasHeader = true;
        transformSectionIntoHeader(section, meta);
        break;
      case 'block':
        transformSectionIntoBlock(section);
        break;
      case 'gallery':
      case 'mosaic':
        transformSectionIntoGallery(section);
        break;
      case 'pull':
        transformSectionIntoUPull(section, meta);
        break;
      default:
        break;
    }

    trackTransformedSection(section);
  });
  debug(`Transformed sections (${Object.keys(transformedSections).length})`, transformedSections);

  if (!hasHeader) {
    prepend(storyEl, LiteHeader(meta));
    debug('No #header/#endheader mount points found. Inserted lite header');
  }

  // Enable drop-caps after headers
  $$('.Header').forEach(el => {
    let nextEl = el.nextElementSibling;

    if (nextEl !== null && nextEl.tagName !== 'P') {
      nextEl = nextEl.nextElementSibling;
    }

    conditionallyApplyUDropcap(nextEl);
  });

  // Enable outdented quotes on direct descendants of richtext elements
  $$('[class*="u-richtext"] > *')
    .filter(el => RICHTEXT_BLOCK_TAGNAMES.indexOf(el.tagName) > -1)
    .forEach(el => conditionallyApplyUQuote(el));
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
        transformMarkerIntoUCTA(marker);
        break;
      case 'hr':
        transformMarkerIntoHR(marker);
        break;
      case 'scrollhint':
        transformMarkerIntoScrollHint(marker);
        break;
      case 'series':
        transformMarkerIntoSeries(marker);
        break;
      case 'share':
        transformMarkerIntoShare(marker, meta.shareLinks);
        break;
      case 'video':
      case 'youtube':
        transformMarkerIntoVideoEmbed(marker);
        break;
      case 'related':
      case 'tease':
        transformMarkerIntoRecirculation(marker, meta);
        break;
      case 'whatnext':
        transformMarkerIntoWhatNext(marker);
        break;
      default:
        break;
    }

    trackTransformedMarker(marker);
  });
  debug(`Transformed markers (${Object.keys(transformedMarkers).length})`, transformedMarkers);

  // Activate existing parallaxes
  const parallaxes = $$('.u-parallax');
  parallaxes.forEach(parallax => activateUParallax(parallax));
  conditionalDebug(parallaxes.length > 0, `Activated ${parallaxes.length} parallax effects`);

  // Transform video embeds
  const videoEmbeds = $$('.inline-content.video, .view-inlineMediaPlayer.doctype-abcvideo', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-video', el)))
    .concat(
      $$('[data-component="Figure"]', storyEl).filter(el =>
        $('[data-component="PlayerButton"][aria-label*="Video"],[data-component="ExpiredMediaWarning"]', el)
      )
    );
  videoEmbeds.forEach(transformElementIntoVideoEmbed);
  conditionalDebug(videoEmbeds.length > 0, `Transformed ${videoEmbeds.length} video embeds`);

  // Transform gallery embeds
  const galleryEmbeds = $$('.inline-content.gallery', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-gallery', el)))
    .concat($$('[class^="comp-embedded-"]', storyEl).filter(el => $('[data-gallery-id]', el)));
  galleryEmbeds.forEach(transformElementIntoGalleryEmbed);
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

    transformElementIntoImageEmbed(el, isSidePulled);
  });
  conditionalDebug(imageEmbeds.length > 0, `Transformed ${imageEmbeds.length} image embeds`);

  // Transform quotes (native and embedded) that haven't already been transformed
  const nativeQuotesAndQuoteEmbeds = $$(SELECTORS.QUOTE, storyEl).filter(el => el.closest('.Quote') === null);
  nativeQuotesAndQuoteEmbeds.forEach(transformElementIntoQuote);
  conditionalDebug(
    nativeQuotesAndQuoteEmbeds.length > 0,
    `Transformed ${nativeQuotesAndQuoteEmbeds.length} native quotes / quote embeds`
  );

  // Nullify nested pulls (outer always wins)
  const nestedPulls = $$('[class*="u-pull"] [class*="u-pull"]');
  nestedPulls.forEach(el => (el.className = el.className.replace(/u-pull(-\w+)?/, 'n-pull$1')));
  conditionalDebug(nestedPulls.length > 0, `Nullified ${nativeQuotesAndQuoteEmbeds.length} nested pulls`);

  // Transform WYSIWYG story teasers (title+image+description convention)
  const wysiwygEmbeds = $$(SELECTORS.WYSIWYG_EMBED, storyEl).filter(doesElMatchConventionOfStoryTeaserEmbed);
  wysiwygEmbeds.forEach(transformElementIntoStoryTeaserEmbed);
  conditionalDebug(wysiwygEmbeds.length > 0, `Transformed ${wysiwygEmbeds.length} WYSIWYG embeds`);

  // In the News app, restore light mode override to PL Datawrapper embeds when on light backgrounds
  const datawrapperIframes = !meta.isNewsApp
    ? []
    : $$(`[data-component="Iframe"] iframe[src*="datawrapper"]`, storyEl).filter(
        el => (el.closest('[class*="u-richtext]') || MOCK_ELEMENT).className.indexOf('u-richtext-invert') === -1
      );
  datawrapperIframes.forEach(el => (el.src = `${el.src}&dark=false`));
  conditionalDebug(
    datawrapperIframes.length > 0,
    `Restored light mode to ${datawrapperIframes.length} Datawrapper embeds`
  );

  // Restore post-story Top Stories thumbnail images in PL
  const postStoryThumbnails = $$('[data-component="TopStories"] [data-component="IntersectionObserver"]').filter(el => {
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
      let numInteractivesResolved = 0;

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

    getMarkers(['image', 'cover', 'gallerytiled']).forEach(marker => (deprecated[`#${marker.name}`] = true));

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
};
