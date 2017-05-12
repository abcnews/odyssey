// External
const cn = require('classnames');
const html = require('bel');
const {formatUIGRelative} = require('inn-abcdatetime-lib');
const url2cmid = require('util-url2cmid');

// Ours
const {MS_VERSION} = require('../../../constants');
const {before, detach, isElement, select, slug, trim} = require('../../../utils');
const {subscribe} = require('../../loop');
const Picture = require('../Picture');
const VideoPlayer = require('../VideoPlayer');

function Header({
  meta = {},
  videoId,
  imgEl,
  smRatio,
  mdRatio,
  lgRatio,
  isDark,
  isLayered,
  miscContentEls = []
}) {
  const className = cn('Header', {
    'is-dark': isDark,
    'is-layered': isLayered && (imgEl || videoId)
  }, 'u-full');

  let mediaEl;

  if (imgEl) {
    mediaEl = Picture({
      src: imgEl.src,
      alt: imgEl.getAttribute('alt'),
      smRatio: smRatio || isLayered ? '3x4' : undefined,
      mdRatio: mdRatio || isLayered ? '1x1' : undefined,
      lgRatio
    });
    
    if (!isLayered) {
      mediaEl.classList.add('u-parallax');
    }
  } else if (videoId) {
    mediaEl = html`<div></div>`;
    VideoPlayer.getMetadata(videoId, (err, metadata) => {
      if (err) {
        return;
      }

      const replacementMediaEl = VideoPlayer(Object.assign(metadata, {isAmbient: true}));

      if (!isLayered) {
        replacementMediaEl.classList.add('u-parallax');
      }

      before(mediaEl, replacementMediaEl);
      detach(mediaEl);
    });
  }

  const clonedMiscContentEls = miscContentEls.map(el => {
      const clonedEl = el.cloneNode(true);

      clonedEl.classList.add('Header-miscEl');

      return clonedEl;
  });

  const clonedBylineNodes = meta.bylineNodes ? meta.bylineNodes.map(node => node.cloneNode(true)) : null;
  const infoSource = meta.infoSource ? html`<a href="${meta.infoSource.url}">${meta.infoSource.name}</a>` : null;
  const updated = meta.updated ? formatUIGRelative(meta.updated) : null;
  const published = formatUIGRelative(meta.published);

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

  const headerEl = html`
    <div class="${className}">
      ${mediaEl ? html`<div class="Header-media${isLayered ? ' u-parallax' : ''}">
        ${mediaEl}
      </div>` : null}
      <div class="Header-content u-richtext${isDark || isLayered && mediaEl ? '-invert' : ''}">
        ${contentEls}
      </div>
    </div>
  `;

  // https://github.com/philipwalton/flexbugs#3-min-height-on-a-flex-container-wont-apply-to-its-flex-items
  if (isLayered && (MS_VERSION === 10 || MS_VERSION === 11)) {
    let lastViewportHeight;
    let headerElMinHeight;
    let lastHeaderElMinHeight;

    subscribe({
      measure: viewport => {
        if (viewport.height !== lastViewportHeight) {
          headerElMinHeight = window.getComputedStyle(headerEl).minHeight;
          lastViewportHeight = viewport.height;
        }
      },
      mutate: () => {
        if (headerElMinHeight !== lastHeaderElMinHeight) {
          headerEl.style.height = headerElMinHeight;
          lastHeaderElMinHeight = headerElMinHeight;
        }
      }  
    });
  }

  return headerEl;
};

function transformSection(section, meta) {
  const [, smRatio] = section.suffix.match(Picture.SM_RATIO_PATTERN) || [];
  const [, mdRatio] = section.suffix.match(Picture.MD_RATIO_PATTERN) || [];
  const [, lgRatio] = section.suffix.match(Picture.LG_RATIO_PATTERN) || [];
  const isDark = section.suffix.indexOf('dark') > -1;
  const isLayered = section.suffix.indexOf('layered') > -1;

  const config = section.betweenNodes.reduce((config, node) => {
    let classList;
    let videoId;
    let imgEl;

    if (!config.videoId && !config.imgEl && isElement(node) ) {
      classList = node.className.split(' ');

      videoId = (
        (classList.indexOf('inline-content') > -1 && classList.indexOf('video') > -1) ||
        (classList.indexOf('view-inlineMediaPlayer') > -1) ||
        (classList.indexOf('embed-content') > -1 && select('.type-video', node))
      ) && url2cmid(select('a', node).getAttribute('href'));

      if (videoId) {
        config.videoId = videoId;
      } else {
        imgEl = select('img', node);

        if (imgEl) {
          config.imgEl = imgEl;
        }
      }
    }

    if (!videoId && !imgEl && isElement(node) && trim(node.textContent).length > 0) {
      config.miscContentEls.push(node);
    }

    return config;
  }, {
    meta,
    smRatio,
    mdRatio,
    lgRatio,
    isDark,
    isLayered,
    miscContentEls: []
  });

  section.replaceWith(Header(config));
}

module.exports = Header;
module.exports.transformSection = transformSection;
