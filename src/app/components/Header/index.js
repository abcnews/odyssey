// External
const cn = require('classnames');
const html = require('bel');
const { formatUIGRelative } = require('inn-abcdatetime-lib');
const url2cmid = require('util-url2cmid');

// Ours
const { MS_VERSION, VIDEO_MARKER_PATTERN } = require('../../../constants');
const { bylineNodes, edition, infoSource, isDarkMode, published, relatedMedia, title, updated } = require('../../env');
const { enqueue, subscribe } = require('../../scheduler');
const { $, detach, isElement } = require('../../utils/dom');
const { dePx, getRatios, slug, trim } = require('../../utils/misc');
const ScrollHint = require('../ScrollHint');
const Picture = require('../Picture');
const UParallax = require('../UParallax');
const VideoPlayer = require('../VideoPlayer');
const YouTubePlayer = require('../YouTubePlayer');
require('./index.scss');

function Header({
  videoId,
  isVideoYouTube,
  imgEl,
  interactiveEl,
  ratios = {},
  isDark,
  isPale,
  isFloating,
  isLayered,
  isKicker,
  miscContentEls = []
}) {
  isFloating = isFloating || (isLayered && !imgEl && !videoId && !interactiveEl);
  isLayered = isLayered || isFloating;
  isDark = isDarkMode || isLayered || isDark;

  ratios = {
    sm: ratios.sm || (isLayered ? '3x4' : undefined),
    md: ratios.md || (isLayered ? '1x1' : undefined),
    lg: ratios.lg
  };

  let mediaChildEl;

  if (interactiveEl) {
    mediaChildEl = interactiveEl.cloneNode(true);
    mediaChildEl.classList.add('Header-interactive');
  } else if (imgEl) {
    mediaChildEl = Picture({
      src: imgEl.src,
      alt: imgEl.getAttribute('alt'),
      ratios
    });
  } else if (videoId) {
    mediaChildEl = isVideoYouTube
      ? YouTubePlayer({
          videoId,
          isAmbient: true,
          ratios
        })
      : VideoPlayer({
          videoId,
          ratios,
          isInvariablyAmbient: true
        });
  }

  if (mediaChildEl && !interactiveEl && !isLayered && edition === 'epic') {
    mediaChildEl.classList.add('u-parallax');
    UParallax.activate(mediaChildEl);
  }

  const mediaEl =
    mediaChildEl && edition === 'epic'
      ? html`
          <div class="Header-media${isLayered && mediaChildEl.tagName !== 'DIV' ? ' u-parallax' : ''}">
            ${!isLayered ? ScrollHint() : null} ${mediaEl}
          </div>
        `
      : null;
  const insetMediaEl =
    mediaChildEl && !mediaEl
      ? html`
          <div class="Header-insetMedia u-full">
            <div class="u-layout"><div class="u-pull">${mediaChildEl}</div></div>
          </div>
        `
      : null;
  const miscEls = miscContentEls.map(el => {
    const clonedEl = el.cloneNode(true);

    clonedEl.classList.add('Header-miscEl');

    return clonedEl;
  });
  const titleEl = html`
    <h1
      class="${
        cn('Header-title', {
          'is-break': !insetMediaEl || !miscEls.length
        })
      }"
    >
      ${
        isKicker && title.indexOf(': ') > -1
          ? title.split(': ').map((text, index) =>
              index === 0
                ? html`
                    <small>${text}</small>
                  `
                : text
            )
          : title
      }
    </h1>
  `;
  const clonedBylineNodes = bylineNodes ? bylineNodes.map(node => node.cloneNode(true)) : null;
  const infoSourceNode = infoSource
    ? infoSource.url
      ? html`
          <a href="${infoSource.url}">${infoSource.name}</a>
        `
      : infoSource.name
    : null;
  const updatedText = typeof updated === 'string' ? updated : formatUIGRelative(updated);
  const publishedText = typeof published === 'string' ? published : formatUIGRelative(published);
  const aboutEls = [
    clonedBylineNodes
      ? html`
          <p class="Header-byline">
            ${
              infoSourceNode && edition !== 'epic'
                ? html`
                    <span class="Header-bylineInfoSource">${infoSourceNode}</span>
                  `
                : null
            }
            ${clonedBylineNodes}
          </p>
        `
      : null,
    infoSourceNode && edition === 'epic'
      ? html`
          <p class="Header-infoSource Header-infoSource--${slug(infoSource.name)}">${infoSourceNode}</p>
        `
      : null,
    updatedText
      ? html`
          <div class="Header-updated">Updated <time datetime="${updated}">${updatedText}</time></div>
        `
      : null,
    publishedText
      ? html`
          <div class="Header-published">Published <time datetime="${published}">${publishedText}</time></div>
        `
      : null
  ];
  const contentChildEls = [].concat(miscEls).concat(aboutEls);

  if (insetMediaEl) {
    contentChildEls[miscEls.length ? 'unshift' : 'push'](insetMediaEl);
  }

  contentChildEls.unshift(titleEl);

  const contentEl = html`
    <div class="Header-content u-richtext${isDark ? '-invert' : ''}">${contentChildEls}</div>
  `;

  const headerEl = html`
    <div
      class="${
        cn(
          'Header',
          {
            'is-dark': isDark,
            'is-pale': isPale,
            'is-floating': isFloating,
            'is-layered': isLayered
          },
          'u-full'
        )
      }"
    >
      ${mediaEl} ${contentEl}
    </div>
  `;

  // https://github.com/philipwalton/flexbugs#3-min-height-on-a-flex-container-wont-apply-to-its-flex-items
  if (isLayered && MS_VERSION > 9 && MS_VERSION < 12) {
    let heightOverride;

    subscribe(function _checkHeaderHeight(client) {
      if (client.hasChanged) {
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
      }
    });
  }

  // Ensure title is in view
  if (!isLayered && mediaEl) {
    setTimeout(() => {
      if (window.scrollY === 0 && headerEl.parentElement.firstElementChild === headerEl) {
        headerContentEl.querySelector('h1').scrollIntoView(false);
      }
    });
  }

  return headerEl;
}

function transformSection(section) {
  const ratios = getRatios(section.configSC);
  const isFloating = edition === 'epic' && section.configSC.indexOf('floating') > -1;
  const isLayered = edition === 'epic' && (isFloating || section.configSC.indexOf('layered') > -1);
  const isDark = edition === 'epic' && (isLayered || section.configSC.indexOf('dark') > -1);
  const isPale = edition === 'epic' && section.configSC.indexOf('pale') > -1;
  const isNoMedia = isFloating || section.configSC.indexOf('nomedia') > -1;
  const isKicker = section.configSC.indexOf('kicker') > -1;
  const shouldSupplant = edition === 'epic' && section.configSC.indexOf('supplant') > -1;

  let candidateNodes = section.betweenNodes;

  if (!isNoMedia && relatedMedia != null) {
    candidateNodes = [relatedMedia.cloneNode(true)].concat(candidateNodes);
  }

  if (shouldSupplant && candidateNodes.length) {
    detach(candidateNodes.shift());
  }

  const config = candidateNodes.reduce(
    (config, node) => {
      let classList = node.className ? node.className.split(' ') : [];
      let videoId;
      let imgEl;
      let interactiveEl;

      // If we found an init-interactive then it takes over being the header media
      if (!isNoMedia && !config.interactiveEl && isElement(node) && edition === 'epic') {
        // special case for parallax hash markers
        const isParallax = node.tagName === 'A' && node.getAttribute('name').indexOf('parallax') === 0;

        // normal init-interactives
        const isInteractive =
          classList.indexOf('init-interactive') > -1 ||
          node.querySelector('[class^="init-interactive"]') ||
          (node.tagName === 'A' && node.getAttribute('name').indexOf('interactive') === 0);

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

          config.videoId = ((parentEl.getAttribute('data-uri') || '').match(/\d+/) || [null])[0];
        } else if (node.name && !!node.name.match(VIDEO_MARKER_PATTERN)) {
          config.isVideoYouTube = node.name.split('youtube')[1];
          config.videoId = videoId = node.name.match(VIDEO_MARKER_PATTERN)[1];
        } else {
          videoId =
            ((classList.indexOf('inline-content') > -1 && classList.indexOf('video') > -1) ||
              classList.indexOf('view-inlineMediaPlayer') > -1 ||
              (classList.indexOf('view-hero-media') > -1 && $('.view-inlineMediaPlayer', node)) ||
              (classList.indexOf('embed-content') > -1 && $('.type-video', node))) &&
            url2cmid($('a', node).getAttribute('href'));

          if (videoId) {
            config.videoId = videoId;
          } else {
            imgEl = $('img', node);

            if (imgEl) {
              config.imgEl = imgEl;
            }
          }
        }
      }

      if (
        !videoId &&
        !imgEl &&
        !interactiveEl &&
        isElement(node) &&
        (trim(node.textContent).length > 0 || node.tagName === 'A') &&
        (edition === 'epic' || node.tagName === 'P')
      ) {
        config.miscContentEls.push(node);
      }

      return config;
    },
    {
      ratios,
      isDark,
      isPale,
      isFloating,
      isLayered,
      isKicker,
      miscContentEls: []
    }
  );

  section.substituteWith(Header(config));
}

module.exports = Header;
module.exports.transformSection = transformSection;
