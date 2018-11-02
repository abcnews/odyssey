// External
const cn = require('classnames');
const html = require('bel');
const { formatUIGRelative } = require('inn-abcdatetime-lib');
const url2cmid = require('util-url2cmid');

// Ours
const { MS_VERSION, VIDEO_MARKER_PATTERN } = require('../../../constants');
const { enqueue, invalidateClient, subscribe } = require('../../scheduler');
const { $, detach, isElement, substitute } = require('../../utils/dom');
const { dePx, getRatios, slug, trim } = require('../../utils/misc');
const ScrollHint = require('../ScrollHint');
const Picture = require('../Picture');
const UParallax = require('../UParallax');
const VideoPlayer = require('../VideoPlayer');
const YouTubePlayer = require('../YouTubePlayer');
require('./index.scss');

function Header({
  meta = {},
  videoElOrId,
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
  isFloating = isFloating || (isLayered && !imgEl && !videoElOrId && !interactiveEl);
  isLayered = isLayered || isFloating;
  isDark = meta.isDarkMode || isLayered || isDark;

  const className = cn(
    'Header',
    {
      'is-dark': isDark,
      'is-pale': isPale,
      'is-floating': isFloating,
      'is-layered': isLayered
    },
    'u-full'
  );

  ratios = {
    sm: ratios.sm || (isLayered ? '3x4' : undefined),
    md: ratios.md || (isLayered ? '1x1' : undefined),
    lg: ratios.lg
  };

  let mediaEl;

  if (interactiveEl) {
    mediaEl = interactiveEl.cloneNode(true);
    mediaEl.classList.add('Header-interactive');
  } else if (imgEl) {
    mediaEl = Picture({
      src: imgEl.src,
      alt: imgEl.getAttribute('alt'),
      ratios
    });

    if (!isLayered) {
      mediaEl.classList.add('u-parallax');
    }
  } else if (videoElOrId) {
    if (isVideoYouTube) {
      mediaEl = YouTubePlayer({
        videoId: videoElOrId,
        isAmbient: true,
        ratios
      });

      if (!isLayered) {
        mediaEl.classList.add('u-parallax');
        UParallax.activate(mediaEl);
      }
    } else {
      mediaEl = html`<div></div>`;
      VideoPlayer.getMetadata(videoElOrId, (err, metadata) => {
        if (err) {
          return;
        }

        const replacementMediaEl = VideoPlayer(
          Object.assign(metadata, {
            ratios,
            isInvariablyAmbient: true
          })
        );

        substitute(mediaEl, replacementMediaEl);

        if (!isLayered) {
          replacementMediaEl.classList.add('u-parallax');
          UParallax.activate(replacementMediaEl);
        }

        invalidateClient();
      });
    }
  }

  const clonedMiscContentEls = miscContentEls.map(el => {
    const clonedEl = el.cloneNode(true);

    clonedEl.classList.add('Header-miscEl');

    return clonedEl;
  });

  const clonedBylineNodes = meta.bylineNodes ? meta.bylineNodes.map(node => node.cloneNode(true)) : null;
  const infoSource = meta.infoSource
    ? meta.infoSource.url
      ? html`<a href="${meta.infoSource.url}">${meta.infoSource.name}</a>`
      : meta.infoSource.name
    : null;
  const updated = typeof meta.updated === 'string' ? meta.updated : formatUIGRelative(meta.updated);
  const published = typeof meta.published === 'string' ? meta.published : formatUIGRelative(meta.published);

  const contentEls = [
    html`<h1>${
      isKicker && meta.title.indexOf(': ') > -1
        ? meta.title.split(': ').map((text, index) => (index === 0 ? html`<small>${text}</small>` : text))
        : meta.title
    }</h1>`
  ]
    .concat(clonedMiscContentEls)
    .concat([
      clonedBylineNodes
        ? html`
      <p class="Header-byline">
        ${clonedBylineNodes}
      </p>
    `
        : null,
      infoSource
        ? html`
      <p class="Header-infoSource Header-infoSource--${slug(meta.infoSource.name)}">
        ${infoSource}
      </p>
    `
        : null,
      updated
        ? html`
      <div class="Header-updated">
        Updated
        <time datetime="${meta.updated}">${updated}</time>
      </div>
    `
        : null,
      published
        ? html`
      <div class="Header-published">
        Published
        <time datetime="${meta.published}">${published}</time>
      </div>
    `
        : null
    ]);

  const headerContentEl = html`
    <div class="Header-content u-richtext${isDark ? '-invert' : ''}">
      ${contentEls}
    </div>
  `;

  const headerEl = html`
    <div class="${className}">
      ${
        mediaEl
          ? html`<div class="Header-media${isLayered && mediaEl.tagName !== 'DIV' ? ' u-parallax' : ''}">
              ${!isLayered ? ScrollHint() : null}
              ${mediaEl}
            </div>`
          : null
      }
      ${headerContentEl}
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

function transformSection(section, meta) {
  const ratios = getRatios(section.configSC);
  const isFloating = section.configSC.indexOf('floating') > -1;
  const isLayered = isFloating || section.configSC.indexOf('layered') > -1;
  const isDark = isLayered || section.configSC.indexOf('dark') > -1;
  const isPale = section.configSC.indexOf('pale') > -1;
  const isNoMedia = isFloating || section.configSC.indexOf('nomedia') > -1;
  const isKicker = section.configSC.indexOf('kicker') > -1;
  const shouldSupplant = section.configSC.indexOf('supplant') > -1;

  let candidateNodes = section.betweenNodes;

  if (!isNoMedia && meta.relatedMedia != null) {
    candidateNodes = [meta.relatedMedia.cloneNode(true)].concat(candidateNodes);
  }

  if (shouldSupplant && candidateNodes.length) {
    detach(candidateNodes.shift());
  }

  const config = candidateNodes.reduce(
    (config, node) => {
      let classList = node.className ? node.className.split(' ') : [];
      let videoEl;
      let videoId;
      let imgEl;
      let interactiveEl;

      // If we found an init-interactive then it takes over being the header media
      if (!isNoMedia && !config.interactiveEl && isElement(node)) {
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

      if (!isNoMedia && !config.videoElOrId && !config.imgEl && !config.interactiveEl && isElement(node)) {
        videoEl = $('video', node);

        if (videoEl) {
          config.videoElOrId = videoEl;
        } else if (node.name && !!node.name.match(VIDEO_MARKER_PATTERN)) {
          config.isVideoYouTube = node.name.split('youtube')[1];
          config.videoElOrId = videoId = node.name.match(VIDEO_MARKER_PATTERN)[1];
        } else {
          videoId =
            ((classList.indexOf('inline-content') > -1 && classList.indexOf('video') > -1) ||
              classList.indexOf('view-inlineMediaPlayer') > -1 ||
              (classList.indexOf('view-hero-media') > -1 && $('.view-inlineMediaPlayer', node)) ||
              (classList.indexOf('embed-content') > -1 && $('.type-video', node))) &&
            url2cmid($('a', node).getAttribute('href'));

          if (videoId) {
            config.videoElOrId = videoId;
          } else {
            imgEl = $('img', node);

            if (imgEl) {
              config.imgEl = imgEl;
            }
          }
        }
      }

      if (
        !videoEl &&
        !videoId &&
        !imgEl &&
        !interactiveEl &&
        isElement(node) &&
        (trim(node.textContent).length > 0 || node.tagName === 'A')
      ) {
        config.miscContentEls.push(node);
      }

      return config;
    },
    {
      meta,
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
