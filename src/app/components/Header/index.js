// External
const html = require('bel');
const ABCDateTime = require('inn-abcdatetime-lib');

// Ours
const {before, isElement, select, slug, trim} = require('../../../utils');
const Picture = require('../Picture');

const SM_RATIO_PATTERN = /sm(\d+x\d+)/;
const MD_RATIO_PATTERN = /md(\d+x\d+)/;
const LG_RATIO_PATTERN = /lg(\d+x\d+)/;

function Header({
  meta = {},
  imageEl,
  smRatio,
  mdRatio,
  lgRatio,
  isDark,
  isLayered,
  miscEls = []
}) {
  const className = `Header${isDark ? ' is-dark' : ''}${isLayered && imageEl ? ' is-layered' : ''} u-full`;
  let pictureEl;

  if (imageEl) {
    pictureEl = Picture({
      src: imageEl.src,
      alt: imageEl.getAttribute('alt'),
      smRatio: smRatio || isLayered ? '3x4' : undefined,
      mdRatio: mdRatio || isLayered ? '1x1' : undefined,
      lgRatio
    });
  }

  const clonedMiscEls = miscEls.map(el => {
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
  .concat(clonedMiscEls)
  .concat([
    clonedBylineNodes ? html`
      <div class="Header-byline">
        ${clonedBylineNodes}
      </div>
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

  const mediaEl = pictureEl ? html`<div class="Header-media u-parallax">
    ${pictureEl}
  </div>` : null;

  return html`
    <div class="${className}">
      ${mediaEl}
      <div class="Header-content u-richtext">
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
    const imageEl = isElement(node) && select('img', node);

    if (!config.imageEl && imageEl) {
      config.imageEl = imageEl;
    } else if (isElement(node) && trim(node.textContent).length > 0) {
      config.miscEls.push(node);
    }

    return config;
  }, {
    meta,
    smRatio,
    mdRatio,
    lgRatio,
    isDark,
    isLayered,
    miscEls: []
  });

  section.replaceWith(Header(config));
}

module.exports = Header;
module.exports.transformSection = transformSection;
