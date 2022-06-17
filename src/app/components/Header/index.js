import { getMountValue, isMount } from '@abcnews/mount-utils';
import cn from 'classnames';
import html from 'bel';
import { url2cmid } from '@abcnews/url2cmid';
import { MS_VERSION, VIDEO_MARKER_PATTERN } from '../../../constants';
import { enqueue, subscribe } from '../../scheduler';
import { terminusFetch } from '../../utils/content';
import { $, detach, detectVideoId, getChildImage, isElement } from '../../utils/dom';
import { clampNumber, dePx, formattedDate, getRatios, trim } from '../../utils/misc';
import ScrollHint from '../ScrollHint';
import Picture from '../Picture';
import { activate as activateUParallax } from '../UParallax';
import VideoPlayer from '../VideoPlayer';
import YouTubePlayer from '../YouTubePlayer';
import './index.scss';

const Header = ({
  imgEl,
  interactiveEl,
  isAbreast,
  isDark,
  isFloating,
  isKicker,
  isLayered,
  isPale,
  isVideoYouTube,
  meta = {},
  miscContentEls = [],
  ratios = {},
  shouldVideoPlayOnce,
  videoId
}) => {
  isFloating = isFloating || (isLayered && !imgEl && !videoId && !interactiveEl);
  isLayered = isLayered || isFloating;
  isDark = isLayered || typeof isDark === 'boolean' ? isDark : meta.isDarkMode;
  isAbreast = !isFloating && !isLayered && (imgEl || videoId || interactiveEl) && isAbreast;

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

  let mediaEl;

  if (interactiveEl) {
    mediaEl = interactiveEl.cloneNode(true);
  } else if (imgEl) {
    mediaEl = Picture({
      src: imgEl.src,
      alt: imgEl.getAttribute('alt'),
      ratios
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

  if (mediaEl && !interactiveEl && !isLayered && !isAbreast) {
    mediaEl.classList.add('u-parallax');
    activateUParallax(mediaEl);
  }

  const titleEl = html`
    <h1>
      ${isKicker && meta.title.indexOf(': ') > -1
        ? meta.title.split(': ').map((text, index) => (index === 0 ? html`<small>${text}</small>` : text))
        : meta.title}
    </h1>
  `;

  const clonedMiscContentEls = miscContentEls.map(el => {
    const clonedEl = el.cloneNode(true);

    clonedEl.classList.add('Header-miscEl');

    return clonedEl;
  });

  const clonedBylineNodes = meta.bylineNodes ? meta.bylineNodes.map(node => node.cloneNode(true)) : null;
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

  const contentEls = [titleEl]
    .concat(clonedMiscContentEls)
    .concat([
      clonedBylineNodes ? html`<p class="Header-byline">${clonedBylineNodes}</p>` : null,
      infoSourceEl,
      updated
        ? html`<div class="Header-updated">Updated <time datetime="${updated.datetime}">${updated.text}</time></div>`
        : null,
      published
        ? html`
            <div class="Header-published">
              Published <time datetime="${published.datetime}">${published.text}</time>
            </div>
          `
        : null
    ]);

  const headerContentEl = html`<div class="Header-content u-richtext${isDark ? '-invert' : ''}">${contentEls}</div>`;

  const headerEl = html`
    <div class="${className}">
      ${mediaEl
        ? html`
            <div class="Header-media${isLayered && !isAbreast && mediaEl.tagName !== 'DIV' ? ' u-parallax' : ''}">
              ${!isLayered && !isAbreast ? ScrollHint() : null} ${mediaEl}
            </div>
          `
        : null}
      ${headerContentEl}
    </div>
  `;

  fetchInfoSourceLogo(meta, infoSourceEl, isLayered ? 'layered' : isDark ? 'dark' : 'light');

  if (isLayered && MS_VERSION > 9 && MS_VERSION < 12) {
    // https://github.com/philipwalton/flexbugs#3-min-height-on-a-flex-container-wont-apply-to-its-flex-items
    let heightOverride;

    subscribe(function _checkIfHeaderHeightNeedsToBeUpdated() {
      const headerElMinHeight = dePx(window.getComputedStyle(headerEl).minHeight);
      const headerContentElHeight = headerContentEl.getBoundingClientRect().height;
      const headerContentElMarginTop = dePx(window.getComputedStyle(headerContentEl).marginTop);
      const nextHeightOverride = Math.max(headerElMinHeight, headerContentElHeight + headerContentElMarginTop);

      if (nextHeightOverride !== heightOverride) {
        heightOverride = nextHeightOverride;
        enqueue(function _updateHeaderHeight() {
          headerEl.style.height = heightOverride + 'px';
        });
      }
    }, true);
  }

  if (!isLayered && !isAbreast) {
    subscribe(function _updateContentPeek() {
      updateContentPeek(headerEl);
    });
  }

  return headerEl;
};

export default Header;

export const Lite = meta => {
  return Header({ meta, imgEl: meta.relatedMedia && getChildImage(meta.relatedMedia.cloneNode(true)) });
};

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

  terminusFetch({ id: meta.infoSourceLogosHTMLFragmentId, type: 'htmlfragment' }, (err, item) => {
    if (err) {
      return;
    }

    const logoDocs = item.contextSettings['meta.data.name'];
    const logoDoc = logoDocs[`${meta.infoSource.name} (${variant})`] || logoDocs[meta.infoSource.name];

    if (logoDoc) {
      terminusFetch({ id: logoDoc.id, type: logoDoc.docType.toLowerCase() }, (err, item) => {
        const image = item.media.image.primary.complete[0];
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
  const isLayered = isFloating || section.configString.indexOf('layered') > -1;
  const isDark =
    isLayered || section.configString.indexOf('dark') > -1
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

  let candidateNodes = section.betweenNodes;

  if (!isNoMedia && meta.relatedMedia != null) {
    candidateNodes = [meta.relatedMedia.cloneNode(true)].concat(candidateNodes);
  }

  if (shouldSupplant && candidateNodes.length) {
    detach(candidateNodes.shift());
  }

  const config = candidateNodes.reduce(
    (config, node) => {
      const classList = node.className ? node.className.split(' ') : [];
      const mountSC = isMount(node) ? getMountValue(node) : '';
      let videoId;
      let imgEl;
      let interactiveEl;

      // If we found an init-interactive then it takes over being the header media
      if (!isNoMedia && !config.interactiveEl && isElement(node)) {
        // special case for parallax mounts
        const isParallax = mountSC.indexOf('parallax') === 0;

        // normal init-interactives
        const isInteractive =
          classList.indexOf('init-interactive') > -1 ||
          node.querySelector('[class^="init-interactive"]') ||
          mountSC.indexOf('interactive') === 0;

        if (isParallax || isInteractive) {
          config.interactiveEl = interactiveEl = node;
        }
      }

      if (!isNoMedia && !config.videoId && !config.imgEl && !config.interactiveEl && isElement(node)) {
        const leadVideoEl = $('video', node); // Phase 1 (Mobile) renders lead videos (Media field) as <video> elements

        if (leadVideoEl) {
          let parentEl = leadVideoEl.parentElement;

          while (parentEl.className.indexOf('media-wrapper-dl') === -1 && parentEl !== document.documentElement) {
            parentEl = parentEl.parentElement;
          }

          config.videoId = videoId = ((parentEl.getAttribute('data-uri') || '').match(/\d+/) || [null])[0];
        } else if (!!mountSC.match(VIDEO_MARKER_PATTERN)) {
          config.isVideoYouTube = !!mountSC.split('youtube')[1];
          config.videoId = videoId = mountSC.match(VIDEO_MARKER_PATTERN)[1];
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

      if (!videoId && !imgEl && !interactiveEl && isElement(node) && (trim(node.textContent).length > 0 || !!mountSC)) {
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
      isLayered,
      isKicker,
      miscContentEls: [],
      shouldVideoPlayOnce
    }
  );

  section.substituteWith(Header(config));
};
