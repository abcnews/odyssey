// External
const cn = require('classnames');
const html = require('bel');
const {formatUIGRelative} = require('inn-abcdatetime-lib');
const url2cmid = require('util-url2cmid');

// Ours
const {IS_PREVIEW, MS_VERSION} = require('../../../constants');
const {enqueue, invalidateClient, subscribe} = require('../../scheduler');
const {$, isElement, prepend, substitute} = require('../../utils/dom');
const {dePx, getRatios, slug, trim} = require('../../utils/misc');
const Picture = require('../Picture');
const UParallax = require('../UParallax');
const VideoPlayer = require('../VideoPlayer');
require('./index.scss');

function Header({
  meta = {},
  videoElOrId,
  imgEl,
  ratios = {},
  isDark,
  isLayered,
  miscContentEls = []
}) {
  const className = cn('Header', {
    'is-dark': meta.isDarkMode || isDark,
    'is-layered': isLayered && (imgEl || videoElOrId)
  }, 'u-full');

  ratios = {
    sm: ratios.sm || (isLayered ? '3x4' : undefined),
    md: ratios.md || (isLayered ? '1x1' : undefined),
    lg: ratios.lg
  };

  let mediaEl;

  if (imgEl) {
    mediaEl = Picture({
      src: imgEl.src,
      alt: imgEl.getAttribute('alt'),
      ratios
    });
    
    if (!isLayered) {
      mediaEl.classList.add('u-parallax');
    }
  } else if (videoElOrId) {
    mediaEl = html`<div></div>`;
    VideoPlayer.getMetadata(videoElOrId, (err, metadata) => {
      if (err) {
        return;
      }

      const replacementMediaEl = VideoPlayer(Object.assign(metadata, {
        ratios,
        isAlwaysHQ: true,
        isAmbient: true
      }));

      substitute(mediaEl, replacementMediaEl);

      if (!isLayered) {
        replacementMediaEl.classList.add('u-parallax');
        UParallax.activate(replacementMediaEl);
      }

      invalidateClient();
    });
  }

  const clonedMiscContentEls = miscContentEls.map(el => {
      const clonedEl = el.cloneNode(true);

      clonedEl.classList.add('Header-miscEl');

      return clonedEl;
  });

  const clonedBylineNodes = meta.bylineNodes ? meta.bylineNodes.map(node => node.cloneNode(true)) : null;
  const infoSource = meta.infoSource ? html`<a href="${meta.infoSource.url}">${meta.infoSource.name}</a>` : null;
  const updated = typeof meta.updated === 'string' ? meta.updated : formatUIGRelative(meta.updated);
  const published = typeof meta.published === 'string' ? meta.published : formatUIGRelative(meta.published);

  const contentEls = [
    html`<h1>${meta.title}</h1>`
  ]
  .concat(clonedMiscContentEls)
  .concat([
    clonedBylineNodes ? html`
      <p class="Header-byline">
        ${clonedBylineNodes}
      </p>
    ` : null,
    infoSource ? html`
      <div class="Header-infoSource Header-infoSource--${slug(meta.infoSource.name)}">
        ${infoSource}
      </div>
    ` : null,
    updated ? html`
      <div class="Header-updated">
        Updated
        <time datetime="${meta.updated}">${updated}</time>
      </div>
    ` : null,
    published ? html`
      <div class="Header-published">
        Published
        <time datetime="${meta.published}">${published}</time>
      </div>
    ` : null
  ]);

  const headerContentEl = html`
    <div class="Header-content u-richtext${isDark || isLayered && mediaEl ? '-invert' : ''}">
      ${contentEls}
    </div>
  `;
    
  const headerEl = html`
    <div class="${className}">
      ${mediaEl ? html`<div class="Header-media${isLayered ? ' u-parallax' : ''}">
        ${mediaEl}
      </div>` : null}
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

        const nextHeightOverride = Math.max(
          headerElMinHeight,
          headerContentElHeight + headerContentElMarginTop
        );

        if (nextHeightOverride !== heightOverride) {
          heightOverride = nextHeightOverride;
          enqueue(function _updateHeaderHeight() {
            headerEl.style.height = heightOverride + 'px';
          });
        }
      }
    });
  }

  return headerEl;
};

function transformSection(section, meta) {
  const ratios = getRatios(section.configSC);
  const isDark = section.configSC.indexOf('dark') > -1;
  const isLayered = section.configSC.indexOf('layered') > -1;

  let candidateNodes = section.betweenNodes;

  if (meta.relatedMedia != null) {
    candidateNodes = [meta.relatedMedia.cloneNode(true)].concat(candidateNodes);
  }

  const config = candidateNodes.reduce((config, node) => {
    let classList;
    let videoEl;
    let videoId;
    let imgEl;

    if (!config.videoElOrId && !config.imgEl && isElement(node) ) {
      classList = node.className.split(' ');
      videoEl = $('video', node);

      if (videoEl) {
        config.videoElOrId = videoEl;
      } else {
        videoId = (
          (classList.indexOf('inline-content') > -1 && classList.indexOf('video') > -1) ||
          (classList.indexOf('view-inlineMediaPlayer') > -1) ||
          (classList.indexOf('view-hero-media') > -1 && $('.view-inlineMediaPlayer', node)) ||
          (classList.indexOf('embed-content') > -1 && $('.type-video', node))
        ) && url2cmid($('a', node).getAttribute('href'));

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

    if (!videoEl && !videoId && !imgEl && isElement(node) && trim(node.textContent).length > 0) {
      config.miscContentEls.push(node);
    }

    return config;
  }, {
    meta,
    ratios,
    isDark,
    isLayered,
    miscContentEls: []
  });

  section.substituteWith(Header(config));
}

module.exports = Header;
module.exports.transformSection = transformSection;
