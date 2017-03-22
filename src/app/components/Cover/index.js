// External
const html = require('bel');
const raf = require('raf');

// Ours
const {detach, isElement, select, trim} = require('../../../utils');
const {getData, subscribe} = require('../../hooks');
const Caption = require('../Caption');
const Picture = require('../Picture');

const ALIGN_PATTERN = /(left|right)/;

function Cover({
  type = 'richtext',
  align,
  mediaEl,
  mediaCaptionEl,
  smRatio,
  mdRatio,
  lgRatio,
  contentEls = []
}) {
  const className = `Cover u-full is-${type}${align ? ` is-${align}` : ''}`;
  const mediaClassName = `Cover-media${type === 'heading' ? ' u-parallax' : ''}`;
  const contentClassName = `Cover-content${type !== 'caption' ? ' u-layout' : ''} u-richtext-invert`;
  let pictureEl;

  if (mediaEl && mediaEl.tagName === 'IMG') {
    mediaEl = Picture({
      src: mediaEl.src,
      alt: mediaEl.getAttribute('alt'),
      smRatio: smRatio || '3x4',
      mdRatio: mdRatio || '1x1',
      lgRatio
    });
  }

  const mediaContainerEl = mediaEl ? html`
    <div class="${mediaClassName}">
      ${mediaEl}
    </div>
  ` : null;

  const coverEl = html`
    <div class="${className}">
      ${mediaContainerEl}
      <div class="${contentClassName}">
        ${contentEls.length > 0 ? contentEls : mediaCaptionEl}
      </div>
    </div>
  `;

  if (mediaContainerEl && type === 'richtext') {
    let listener = null;
    let state = {};
    let nextState = {};

    function updateNextState(data) {
      const rect = coverEl.getBoundingClientRect();
      const isBeyond = data.windowInnerHeight >= rect.bottom;
      const isFixed = !isBeyond && rect.top <= 0;

      nextState = {
        isFixed,
        isBeyond
      };
    }

    function updateMediaPosition() {
      if (nextState.isFixed !== state.isFixed) {
        mediaContainerEl.classList[nextState.isFixed ? 'add' : 'remove']('is-fixed');
      }

      if (nextState.isBeyond !== state.isBeyond) {
        mediaContainerEl.classList[nextState.isBeyond ? 'add' : 'remove']('is-beyond');
      }

      state = nextState;
    }

    subscribe({
      onSize: updateNextState,
      onPan: updateNextState,
      onFrame: updateMediaPosition
    });

    raf(() => {
      updateNextState(getData());
    });
  }

  return coverEl;
};

function transformSection(section) {
  const [, align] = section.suffix.match(ALIGN_PATTERN) || [];
  const [, smRatio] = section.suffix.match(Picture.SM_RATIO_PATTERN) || [];
  const [, mdRatio] = section.suffix.match(Picture.MD_RATIO_PATTERN) || [];
  const [, lgRatio] = section.suffix.match(Picture.LG_RATIO_PATTERN) || [];

  const nodes = [].concat(section.betweenNodes);

  const config = nodes.reduce((config, node) => {
    const mediaEl = isElement(node) && select('img, video', node);

    if (!config.mediaEl && mediaEl) {
      config.mediaEl = mediaEl;
      config.mediaCaptionEl = Caption.createFromEl(node);
      detach(node);
    } else if (isElement(node) && trim(node.textContent).length > 0) {
      config.contentEls.push(node);
    }

    return config;
  }, {
    align,
    smRatio,
    mdRatio,
    lgRatio,
    contentEls: []
  });

  if (config.contentEls.length === 0) {
    config.type = 'caption';
  } else if (config.contentEls.length === 1 && config.contentEls[0].tagName === 'H2') {
    config.type = 'heading';
  }

  section.betweenNodes = [];

  section.replaceWith(Cover(config));
}

module.exports = Cover;
module.exports.transformSection = transformSection;
