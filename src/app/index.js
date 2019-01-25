// External
import html from 'bel';

// Ours
import { IS_PREVIEW, RICHTEXT_BLOCK_TAGNAMES, SELECTORS } from '../constants';
import api from './api';
import { PresentationLayerAsyncComponent } from './async-components/loader';
import { createFromEl as createCaptionFromEl } from './components/Caption';
import Comments from './components/Comments';
import { transformSection as transformSectionIntoBlock } from './components/Block';
import { transformSection as transformSectionIntoGallery } from './components/Gallery';
import Header, { transformSection as transformSectionIntoHeader } from './components/Header';
import { transformEl as transformElIntoImageEmbed } from './components/ImageEmbed';
import MasterGallery, { register as registerWithMasterGallery } from './components/MasterGallery';
import { transformEl as transformElIntoQuote } from './components/Quote';
import { transformMarker as transformSectionIntoRecirculation } from './components/Recirculation';
import { transformMarker as transformSectionIntoScrollHint } from './components/ScrollHint';
import { transformMarker as transformSectionIntoSeries } from './components/Series';
import { transformMarker as transformSectionIntoShare } from './components/Share';
import { conditionallyApply as conditionallyApplyUDropcap } from './components/UDropcap';
import { conditionallyApply as conditionallyApplyUQuote } from './components/UQuote';
import { activate as activateUParallax } from './components/UParallax';
import { transformSection as transformSectionIntoUPull } from './components/UPull';
import {
  transformEl as transformElIntoVideoEmbed,
  transformMarker as transformMarkerIntoVideoEmbed
} from './components/VideoEmbed';
import { start } from './scheduler';
import { getMeta } from './meta';
import { reset } from './reset';
import { getMarkers, getSections } from './utils/anchors';
import { $, $$, after, append, detach, detachAll, prepend, substitute } from './utils/dom';

function app() {
  const meta = getMeta();
  const storyEl = reset($(SELECTORS.STORY), meta);

  if (!$('[data-component="Masthead"]')) {
    after($(SELECTORS.GLOBAL_NAV), PresentationLayerAsyncComponent('Nav'));
  }

  start(); // loop

  // Register all embedded images with MasterGallery
  $$('.inline-content.photo, [class*="view-image-embed"]', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-photo', el)))
    .forEach(registerWithMasterGallery);

  let hasHeader = false;

  // Transform sections
  getSections(['header', 'remove', 'block', 'gallery', 'mosaic', 'pull']).forEach(section => {
    switch (section.name) {
      case 'header':
        hasHeader = true;
        transformSectionIntoHeader(section, meta);
        break;
      case 'remove':
        detachAll([section.startNode, section.endNode].concat(section.betweenNodes));
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

    conditionallyApplyUDropcap(nextEl);
  });

  // Enable outdented quotes on direct descendants of richtext elements
  $$('[class*="u-richtext"] > *')
    .filter(el => RICHTEXT_BLOCK_TAGNAMES.indexOf(el.tagName) > -1)
    .forEach(conditionallyApplyUQuote);

  // Transform markers
  getMarkers(['cta', 'hr', 'scrollhint', 'series', 'share', 'video', 'youtube', 'related', 'tease']).forEach(marker => {
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
        conditionallyApplyUDropcap(el.nextElementSibling);
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
      default:
        break;
    }
  });

  // Activate existing parallaxes
  $$('.u-parallax').forEach(activateUParallax);

  // Transform image embeds
  const sidePulls = $$('.u-pull-left, .u-pull-right');

  $$('.inline-content.photo, [class*="view-image-embed"]', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-photo', el)))
    .forEach(el => {
      const isSidePulled = sidePulls.filter(pEl => pEl.contains(el)).length > 0;

      transformElIntoImageEmbed(el, isSidePulled);
    });

  // Transform video embeds
  $$('.inline-content.video, .view-inlineMediaPlayer', storyEl)
    .concat($$('.embed-content', storyEl).filter(el => $('.type-video', el)))
    .forEach(transformElIntoVideoEmbed);

  // Transform quotes (native and embedded)
  $$(
    'blockquote:not([class]), .quote--pullquote, .inline-content.quote, .embed-quote, .comp-rich-text-blockquote, .view-inline-pullquote',
    storyEl
  ).forEach(transformElIntoQuote);

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
        const captionEl = createCaptionFromEl(el);
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

export default app;
