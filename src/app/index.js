// @ts-check
import api from './api';
import { transformSection as transformSectionIntoBackdrop } from './components/Backdrop';
import { transformSection as transformSectionIntoBlock } from './components/Block';
import FormatCredit from './components/FormatCredit';
import FormatCreditLegacy from './components/legacy/FormatCredit';
import { transformSection as transformSectionIntoGallery } from './components/Gallery';
import { Lite as LiteHeader, transformSection as transformSectionIntoHeader } from './components/Header';
import { transformMarker as transformMarkerIntoHR } from './components/HR';
import {
  transformElement as transformElementIntoImageEmbed,
  transformMarker as transformMarkerIntoImageEmbed
} from './components/ImageEmbed';
import { transformElement as transformElementIntoInteractiveEmbed } from './components/InteractiveEmbed';
import MasterGallery, { register as registerWithMasterGallery } from './components/MasterGallery';
import {
  transformBeforeAndAfterMarker as transformBeforeAndAfterMarkerIntoMosaic,
  transformSection as transformSectionIntoMosaic
} from './components/Mosaic';
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
import { activate as activateUParallax } from './components/UParallax';
import { transformSection as transformSectionIntoUPull } from './components/UPull';
import { conditionallyApply as conditionallyApplyUQuote } from './components/UQuote';
import './components/utilities/index.scss';
import {
  transformElement as transformElementIntoVideoEmbed,
  transformMarker as transformMarkerIntoVideoEmbed
} from './components/VideoEmbed';
import { transformMarker as transformMarkerIntoWhatNext } from './components/WhatNext';
import { MOCK_ELEMENT, RICHTEXT_BLOCK_TAGNAMES, SELECTORS } from './constants';
import './keyframes.scss';
import { initMeta } from './meta';
import { reset } from './reset';
import { start } from './scheduler';
import { mockDecoyActivationsUnderEl } from './utils/decoys';
import { $, $$, append, detachAll, prepend, substitute } from './utils/dom';
import { conditionalDebug, debug } from './utils/logging';
import { getMarkers, getSections } from './utils/mounts';

export default terminusDocument => {
  const meta = initMeta(terminusDocument);
  const storyEl = $(SELECTORS.STORY);

  if (!storyEl) {
    debug('Story is empty. Nothing to do');
    return;
  }

  const mainEl = reset(storyEl, meta);
  mainEl.parentElement?.classList.add(meta.isFuture ? 'is-future' : 'is-legacy');
  debug('Performed page reset');

  mockDecoyActivationsUnderEl(mainEl); // Mock PL's decoy activation events
  start(); // scheduler loop

  // Register all embedded images with MasterGallery
  meta.masterGalleryImages?.forEach(image => registerWithMasterGallery(image));

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
        transformSectionIntoBlock(section, meta);
        break;
      case 'gallery':
        transformSectionIntoGallery(section);
        break;
      case 'mosaic':
        transformSectionIntoMosaic(section);
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
    prepend(mainEl, LiteHeader(meta));
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
    'beforeandafterstart',
    'cta',
    'hr',
    'scrollhint',
    'series',
    'share',
    'image',
    'video',
    'youtube',
    'related',
    'tease',
    'whatnext'
  ]).forEach(marker => {
    let shouldTrackTransformedMarker = true;

    switch (marker.name) {
      case 'beforeandafterstart':
        if (transformBeforeAndAfterMarkerIntoMosaic(marker) === false) {
          shouldTrackTransformedMarker = false;
        }
        break;
      case 'cta':
        transformMarkerIntoUCTA(marker);
        break;
      case 'hr':
        transformMarkerIntoHR(marker, meta);
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
      case 'image':
        transformMarkerIntoImageEmbed(marker);
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

    if (shouldTrackTransformedMarker) {
      trackTransformedMarker(marker);
    }
  });
  debug(`Transformed markers (${Object.keys(transformedMarkers).length})`, transformedMarkers);

  // Activate existing parallaxes
  const parallaxes = $$('.u-parallax');
  parallaxes.forEach(parallax => activateUParallax(parallax));
  conditionalDebug(parallaxes.length > 0, `Activated ${parallaxes.length} parallax effects`);

  // Transform video embeds
  const videoEmbeds = $$('[data-component="Figure"]', mainEl).filter(el =>
    $('[data-component="VideoPlayer"],[data-component="ExpiredMediaWarning"]', el)
  );
  videoEmbeds.forEach(transformElementIntoVideoEmbed);
  conditionalDebug(videoEmbeds.length > 0, `Transformed ${videoEmbeds.length} video embeds`);

  // Transform image embeds
  const sidePulls = $$('.u-pull-left, .u-pull-right');
  const imageEmbeds = $$('[data-component="Figure"]', mainEl).filter(el => {
    const dataURI = el.getAttribute('data-uri') || '';

    return ['audio', 'customimage', 'video'].find(docType => dataURI.indexOf(docType) > -1) == null && $('img', el);
  });
  imageEmbeds.forEach(el => transformElementIntoImageEmbed(el)); //, sidePulls.filter(pEl => pEl.contains(el)).length > 0));
  conditionalDebug(imageEmbeds.length > 0, `Transformed ${imageEmbeds.length} image embeds`);

  // Transform quotes (native and embedded) that haven't already been transformed
  const nativeQuotesAndQuoteEmbeds = $$(SELECTORS.QUOTE, mainEl);
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
  const wysiwygEmbeds = $$(SELECTORS.WYSIWYG_EMBED, mainEl).filter(doesElMatchConventionOfStoryTeaserEmbed);
  wysiwygEmbeds.forEach(transformElementIntoStoryTeaserEmbed);
  conditionalDebug(wysiwygEmbeds.length > 0, `Transformed ${wysiwygEmbeds.length} WYSIWYG embeds`);

  // Transform interactive embeds (things like Tweets & Instagram posts)
  const interactiveEmbeds = meta._articledetail.text.descriptor.children
    .filter(({ type }) => type === 'interactive')
    .reduce((memo, { props }) => {
      const el = $(`[itemid="${props.embedURL}"]`);

      if (el) {
        el.setAttribute('data-provider', props.providerType);

        return [...memo, el];
      }

      return memo;
    }, []);
  interactiveEmbeds.forEach(transformElementIntoInteractiveEmbed);
  conditionalDebug(interactiveEmbeds > 0, `Transformed ${interactiveEmbeds.length} interactive embeds`);

  // Take-up dynamic height management of embedded external link iframes
  const embeddedExternalLinkIframes = $$(`[data-component="Iframe"] iframe[src*="abcnewsembedheight"]`, mainEl);
  embeddedExternalLinkIframes.forEach(el => {
    if (!(el instanceof HTMLIFrameElement)) return;
    window.addEventListener(
      'message',
      event => {
        if (
          el &&
          el.contentWindow === event.source &&
          event.data &&
          event.data.type === 'embed-size' &&
          typeof event.data.height === 'number'
        ) {
          el.setAttribute('height', event.data.height);
        }
      },
      false
    );
  });
  conditionalDebug(
    embeddedExternalLinkIframes.length > 0,
    `Took-up dynamic height management of ${embeddedExternalLinkIframes.length} embedded external links`
  );

  // Set correct mode for Datawrapper embeds, based on current background
  const datawrapperIframes = $$(`[data-component="Iframe"] iframe[src*="datawrapper"]`, mainEl);
  datawrapperIframes.forEach(el => {
    if (!(el instanceof HTMLIFrameElement)) {
      return;
    }
    const shouldBeDark =
      (el.closest('[class*="u-richtext"]') || MOCK_ELEMENT).className.indexOf('u-richtext-invert') > -1;
    const desiredParam = `dark=${shouldBeDark}`;
    const paramPattern = /dark=\w+/;
    const desiredSrc = paramPattern.test(el.src)
      ? el.src.replace(paramPattern, desiredParam)
      : `${el.src}&${desiredParam}`;

    // Always remove the white background (set by PL's className)
    el.style.setProperty('background-color', 'transparent');
    el.style.setProperty('color-scheme', shouldBeDark ? 'dark' : 'light');

    // Change the URL, if needed
    if (el.src !== desiredSrc) {
      el.src = desiredSrc;
    }
  });
  conditionalDebug(
    datawrapperIframes.length > 0,
    `Set correct mode to ${datawrapperIframes.length} Datawrapper embeds`
  );

  // Append format credit for non-DSI stories
  if (meta.productionUnit !== 'EDL team' && (meta.infoSource || {}).name !== 'Digital Story Innovation Team') {
    append(mainEl, meta.isFuture ? FormatCredit() : FormatCreditLegacy());
    debug('Appended Odyssey format credit');
  }

  // Append master gallery
  append(mainEl, MasterGallery());
  debug('Appended master gallery');

  // Restore post-story Top Stories thumbnail images
  const postStoryThumbnails = $$('[data-component="TopStories"] [data-component="IntersectionObserver"]').filter(el => {
    const imgEl = $('img', el);
    return imgEl && imgEl.getAttribute('data-src');
  });
  postStoryThumbnails.forEach(el => {
    substitute(
      el,
      Picture({
        src: $('img', el)?.getAttribute('data-src') || undefined,
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

  // Expose API, then notify interested parties
  Object.defineProperty(window, '__ODYSSEY__', { value: api });
  window.dispatchEvent(new CustomEvent('odyssey:api', { detail: api }));
  debug('Dispatched `odyssey:api` event');
};
