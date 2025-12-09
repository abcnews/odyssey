// @ts-check
import { getMountValue, isMount } from '@abcnews/mount-utils';
import cn from 'classnames';
import html from 'nanohtml';
import { THEME, VIDEO_MARKER_PATTERN } from '../../constants';
import { enqueue, subscribe } from '../../scheduler';
import { fetchDocument } from '../../utils/content';
import { $, detach, detectVideoId, getChildImage, isElement } from '../../utils/dom';
import { clampNumber, formattedDate, getRatios, isDefined } from '../../utils/misc';
import Picture from '../Picture';
import ScrollHint from '../ScrollHint';
import VideoPlayer from '../VideoPlayer';
import YouTubePlayer from '../YouTubePlayer';
import styles from './index.lazy.scss';

/**
 * @typedef {object} HeaderConfig
 * @prop {HTMLImageElement} imgEl
 * @prop {boolean} isAbreast
 * @prop {boolean} isDark
 * @prop {boolean} isFloating
 * @prop {boolean} isKicker
 * @prop {boolean} isLayered
 * @prop {boolean} isPale
 * @prop {boolean} isVideoYouTube
 * @prop {boolean} isParallax
 * @prop {Partial<import('src/app/meta').MetaData>} meta
 * @prop {{value: number; units: string}} [mediaWidth]
 * @prop {Element[]} miscContentEls
 * @prop {import('../../utils/misc').Ratios} ratios
 * @prop {boolean} shouldVideoPlayOnce
 * @prop {string|number} videoId
 */

/**
 * Create a header component
 * @param {Partial<HeaderConfig>} config Configuration to create header.
 * @returns {HTMLElement}
 */
const Header = ({
  imgEl,
  isAbreast,
  isDark,
  isFloating,
  isKicker,
  isLayered,
  isPale,
  isVideoYouTube,
  isParallax,
  meta = {},
  mediaWidth,
  miscContentEls = [],
  ratios = {},
  shouldVideoPlayOnce,
  videoId
}) => {
  isFloating = isFloating || (isLayered && !imgEl && !videoId);
  isLayered = isLayered || isFloating;
  isDark = typeof isDark === 'boolean' ? isDark : !!meta.isDarkMode;
  isAbreast = !isFloating && !isLayered && (isDefined(imgEl) || isDefined(videoId)) && isAbreast;

  const scheme = isDark ? 'dark' : 'light';

  const className = cn(
    'Header',
    {
      'is-abreast': isAbreast,
      'is-dark': isDark,
      'is-pale': isPale,
      'is-floating': isFloating,
      'is-layered': isLayered
    },
    'u-full'
  );

  ratios = {
    sm: ratios.sm || (isLayered ? '3x4' : '1x1'),
    md: ratios.md || (isLayered ? '1x1' : '3x2'),
    lg: isAbreast ? '3x4' : ratios.lg,
    xl: isAbreast ? '1x1' : ratios.xl
  };

  /**
   * @type {HTMLElement | undefined}
   */
  let mediaEl;

  if (imgEl) {
    mediaEl = Picture({
      src: imgEl.src,
      alt: imgEl.getAttribute('alt'),
      ratios,
      shouldLazyLoad: false
    });
  } else if (videoId) {
    mediaEl = isVideoYouTube
      ? YouTubePlayer({
          videoId,
          isLoop: shouldVideoPlayOnce ? false : undefined,
          isAmbient: true,
          ratios
        })
      : VideoPlayer({
          videoId,
          ratios,
          isLoop: shouldVideoPlayOnce ? false : undefined,
          isInvariablyAmbient: true
        });
  }

  const titleEl = html`
    <h1>
      ${isKicker && meta.title && meta.title.indexOf(': ') > -1
        ? meta.title.split(': ').map((text, index) => (index === 0 ? html`<small>${text}</small>` : text))
        : meta.title}
    </h1>
  `;

  const clonedMiscContentEls = miscContentEls.map(el => {
    const clonedEl = el.cloneNode(true);

    if (isElement(clonedEl)) {
      clonedEl.classList.add('Header-miscEl');
    }

    return clonedEl;
  });

  const clonedBylineNodes = meta.bylineNodes ? meta.bylineNodes.map(node => node.cloneNode(true)) : null;
  const clonedMetadataNodes = meta.metadataNodes ? meta.metadataNodes.map(node => node.cloneNode(true)) : null;
  const infoSourceEl = meta.infoSource
    ? html`
        <p class="Header-infoSource">
          ${meta.infoSource.url
            ? html`<a href="${meta.infoSource.url}">${meta.infoSource.name}</a>`
            : meta.infoSource.name}
        </p>
      `
    : null;
  const [published, updated] = [meta.published, meta.updated].map(date =>
    date
      ? {
          datetime: date.toISOString(),
          text: formattedDate(date)
        }
      : null
  );

  /** @type {(Node|null|undefined)[]} */
  const contentEls = [
    titleEl,
    ...clonedMiscContentEls,
    clonedBylineNodes ? html`<p class="Header-byline">${clonedBylineNodes}</p>` : null,
    !meta.isFuture ? infoSourceEl : null,
    meta.isFuture && clonedMetadataNodes?.length ? html`<div class="Header-meta">${clonedMetadataNodes}</div>` : null,
    updated && !meta.isFuture
      ? html`<div class="Header-updated">Updated <time datetime="${updated.datetime}">${updated.text}</time></div>`
      : null,
    published && !meta.isFuture
      ? html`
          <div class="Header-published">Published <time datetime="${published.datetime}">${published.text}</time></div>
        `
      : null
  ];

  const headerContentEl = html`<div class="Header-content u-richtext${isDark ? '-invert' : ''}">${contentEls}</div>`;

  const mediaClassName = cn([
    'Header-media',
    { 'u-parallax': isLayered && !isAbreast && mediaEl?.tagName !== 'DIV' && isParallax }
  ]);

  const headerEl = html`
    <div class="${className}" data-scheme="${scheme}" data-theme="${THEME}">
      ${mediaEl
        ? html`
            <div
              class="${mediaClassName}"
              style="${mediaWidth ? '--od-header-media-width: ' + mediaWidth.value + mediaWidth.units : ''}"
            >
              ${!isLayered && !isAbreast && !meta.isFuture ? ScrollHint() : null} ${mediaEl}
            </div>
          `
        : null}
      ${headerContentEl}
    </div>
  `;

  fetchInfoSourceLogo(meta, infoSourceEl, isLayered ? 'layered' : isDark ? 'dark' : 'light');

  if (!isLayered && !isAbreast) {
    subscribe(function _updateContentPeek() {
      updateContentPeek(headerEl);
    });
  }

  styles.use();

  return headerEl;
};

export default Header;

/**
 * Create a lite header for when no header configuration or content is specified.
 * @param {Partial<import('src/app/meta').MetaData>} meta Page metadata
 * @returns {HTMLElement}
 */
export const Lite = meta => {
  return Header({ meta, imgEl: meta.relatedMedia && getChildImage(meta.relatedMedia.cloneNode(true)) });
};

/**
 * Update the CSS custom prop that controls how much content is visible below the header before scroll
 * @param {HTMLElement} headerEl The Header element
 */
function updateContentPeek(headerEl) {
  let titleHeight = 0;
  let titleBottomMargin = 0;
  const titleEl = $('h1', headerEl);

  if (titleEl) {
    titleHeight = titleEl.getBoundingClientRect().height;
    titleBottomMargin = +window.getComputedStyle(titleEl).marginBottom.replace('px', '');
  }

  enqueue(function _updateContentPeekCustomProp() {
    headerEl.style.setProperty('--Header-contentPeek', Math.round(titleHeight + titleBottomMargin) + 'px');
  });
}

function fetchInfoSourceLogo(meta, el, variant) {
  if (!meta.infoSourceLogosHTMLFragmentId || !el) {
    return;
  }

  fetchDocument({ id: meta.infoSourceLogosHTMLFragmentId, type: 'htmlfragment' }).then(htmlFragmentDoc => {
    const logoDocsRefs = htmlFragmentDoc.contextSettings['meta.data.name'];
    const logoDocRef = logoDocsRefs[`${meta.infoSource.name} (${variant})`] || logoDocsRefs[meta.infoSource.name];

    if (logoDocRef) {
      fetchDocument({ id: logoDocRef.id, type: logoDocRef.docType.toLowerCase() }).then(imageDoc => {
        const image = imageDoc.media.image.primary.complete[0];
        const imageRatio = image.height / image.width;

        el.className = `${el.className} has-logo`;
        // Height based on the image ratio (wider is shorter), clamped between 48px and 64px
        el.style.height = `${clampNumber(Math.round(64 * imageRatio), 48, 64)}px`;
        el.style.backgroundImage = `url(${image.url})`;
      });
    }
  });
}

export const transformSection = (section, meta) => {
  const ratios = getRatios(section.configString);
  const isFloating = section.configString.indexOf('floating') > -1;
  const isParallax = section.configString.indexOf('parallax') > -1;
  const isLayered = isFloating || section.configString.indexOf('layered') > -1;
  const isDark =
    (isLayered && !meta.isFuture) || section.configString.indexOf('dark') > -1
      ? true
      : section.configString.indexOf('light') > -1
      ? false
      : null;
  const isPale = section.configString.indexOf('pale') > -1;
  const isAbreast = section.configString.indexOf('abreast') > -1;
  const isNoMedia = isFloating || section.configString.indexOf('nomedia') > -1;
  const isKicker = section.configString.indexOf('kicker') > -1;
  const shouldSupplant = section.configString.indexOf('supplant') > -1;
  const shouldVideoPlayOnce = section.configString.indexOf('once') > -1;
  /** @type {(string|undefined)[]} */
  const [, , mediaWidthValue, mediaWidthUnit] = section.configString.match(/mediawidth(([0-9]+)(px|pct|rem))/) || [];
  let candidateNodes = section.betweenNodes;

  if (!isNoMedia && meta.relatedMedia != null) {
    candidateNodes = [meta.relatedMedia.cloneNode(true)].concat(candidateNodes);
  }

  if (shouldSupplant && candidateNodes.length) {
    detach(candidateNodes.shift());
  }

  const config = candidateNodes.reduce(
    (config, node) => {
      const mountValue = isMount(node) ? getMountValue(node) : '';
      const isVideoMarker = !!mountValue.match(VIDEO_MARKER_PATTERN);
      let videoId;
      let imgEl;

      if (!isNoMedia && !config.videoId && !config.imgEl && isElement(node)) {
        if (isVideoMarker) {
          config.isVideoYouTube = !!mountValue.split('youtube')[1];
          config.videoId = videoId = mountValue.match(VIDEO_MARKER_PATTERN)?.[1];
        } else {
          videoId = detectVideoId(node);

          if (videoId) {
            config.videoId = videoId;
          } else {
            imgEl = getChildImage(node);

            if (imgEl) {
              config.imgEl = imgEl;
            }
          }
        }
      }

      if (!videoId && !imgEl && isElement(node) && ((node.textContent || '').trim().length > 0 || !!mountValue)) {
        config.miscContentEls.push(node);
      }

      return config;
    },
    {
      meta,
      ratios,
      isAbreast,
      isDark,
      isPale,
      isFloating,
      isParallax,
      isLayered,
      isKicker,
      mediaWidth: mediaWidthValue
        ? { value: +mediaWidthValue, units: mediaWidthUnit?.replace('pct', '%') || 'px' }
        : undefined,
      miscContentEls: [],
      shouldVideoPlayOnce
    }
  );

  section.substituteWith(Header(config));
};
