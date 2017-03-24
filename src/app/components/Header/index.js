// External
const cn = require('classnames');
const html = require('bel');
const ABCDateTime = require('inn-abcdatetime-lib');

// Ours
const {before, isElement, select, slug, trim} = require('../../../utils');
const Picture = require('../Picture');

function Header({
  meta = {},
  mediaEl,
  smRatio,
  mdRatio,
  lgRatio,
  isDark,
  isLayered,
  miscContentEls = []
}) {
  const className = cn('Header', {
    'is-dark': isDark,
    'is-layered': isLayered && mediaEl
  }, 'u-full');

  if (mediaEl && mediaEl.tagName === 'IMG') {
    mediaEl = Picture({
      src: mediaEl.src,
      alt: mediaEl.getAttribute('alt'),
      smRatio: smRatio || isLayered ? '3x4' : undefined,
      mdRatio: mdRatio || isLayered ? '1x1' : undefined,
      lgRatio
    });
  }

  const clonedMiscContentEls = miscContentEls.map(el => {
      const clonedEl = el.cloneNode(true);

      clonedEl.classList.add('Header-miscEl');

      return clonedEl;
  });

  const clonedBylineNodes = meta.bylineNodes ? meta.bylineNodes.map(node => node.cloneNode(true)) : null;
  const infoSource = meta.infoSource ? html`<a href="${meta.infoSource.url}">${meta.infoSource.name}</a>` : null;
  const updated = meta.updated ? ABCDateTime.formatUIGRelative(meta.updated) : null;
  const published = ABCDateTime.formatUIGRelative(meta.published);

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

  return html`
    <div class="${className}">
      ${mediaEl ? html`<div class="Header-media u-parallax">
        ${mediaEl}
      </div>` : null}
      <div class="Header-content u-richtext${isDark || isLayered && mediaEl ? '-invert' : ''}">
        ${contentEls}
      </div>
    </div>
  `;
};

function transformSection(section, meta) {
  const [, smRatio] = section.suffix.match(Picture.SM_RATIO_PATTERN) || [];
  const [, mdRatio] = section.suffix.match(Picture.MD_RATIO_PATTERN) || [];
  const [, lgRatio] = section.suffix.match(Picture.LG_RATIO_PATTERN) || [];
  const isDark = section.suffix.indexOf('dark') > -1;
  const isLayered = section.suffix.indexOf('layered') > -1;

  const config = section.betweenNodes.reduce((config, node) => {
    const mediaEl = isElement(node) && select('img, video', node);

    if (!config.mediaEl && mediaEl) {
      config.mediaEl = mediaEl;
    } else if (isElement(node) && trim(node.textContent).length > 0) {
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
