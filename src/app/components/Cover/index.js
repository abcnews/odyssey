// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const {IS_PREVIEW} = require('../../../constants');
const {detach, isElement, $, substitute, trim} = require('../../../utils');
const {enqueue, invalidateClient, subscribe} = require('../../scheduler');
const Caption = require('../Caption');
const Picture = require('../Picture');
const VideoPlayer = require('../VideoPlayer');

const ALIGNMENT_PATTERN = /(left|right)/;

function Cover({
  type = 'richtext',
  isDocked,
  isPiecemeal,
  alignment,
  videoId,
  imgEl,
  smRatio,
  mdRatio,
  lgRatio,
  contentEls = []
}) {
  const className = cn('Cover', `is-${type}`, {
    'is-piecemeal': type === 'richtext' && isPiecemeal,
    [`is-${alignment}`]: alignment
  }, 'u-full');
  const mediaClassName = cn('Cover-media', {
    'u-parallax': type === 'heading',
    'is-fixed': type === 'richtext' && !isDocked
  });
  const contentClassName = 'Cover-content u-layout u-richtext-invert';

  let mediaEl;

  if (imgEl) {
    const src = imgEl.src;
    const alt = imgEl.getAttribute('alt');
    const id = url2cmid(src);

    mediaEl = Picture({
      src,
      alt,
      smRatio: smRatio || (type === 'heading' ? '3x2' : '3x4'),
      mdRatio: mdRatio || (type === 'heading' ? '16x9' : type === 'richtext' ? '1x1' : '4x3'),
      lgRatio
    });
  } else if (videoId) {
    mediaEl = html`<div></div>`;
    VideoPlayer.getMetadata(videoId, (err, metadata) => {
      if (err) {
        if (IS_PREVIEW) {
          substitute(mediaEl, VideoPlayer.UnpublishedVideoPlaceholder(videoId));
        }
      
        return;
      }

      const replacementMediaEl = VideoPlayer(Object.assign(metadata, {isAmbient: true}));

      substitute(mediaEl, replacementMediaEl);
      invalidateClient();
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
      ${isPiecemeal ?
        contentEls.map(contentEl => html`
          <div class="${contentClassName}">
            ${contentEl}
          </div>
        `) :
        contentEls.length > 0 ? html`
          <div class="${contentClassName}">
            ${contentEls}
          </div>
        ` :
        null
      }
    </div>
  `;

  if (mediaContainerEl && type === 'richtext' && isDocked) {
    let state = {};

    subscribe(function _checkIfCoverPropertiesShouldBeUpdated(client) {
      const rect = coverEl.getBoundingClientRect();
      const isBeyond = client.height >= rect.bottom;
      const isFixed = !isBeyond && rect.top <= 0;

      if (isFixed !== state.isFixed || isBeyond !== state.isBeyond) {
        enqueue(function _updateCoverProperties() {
          mediaContainerEl.classList[isFixed ? 'add' : 'remove']('is-fixed');
          mediaContainerEl.classList[isBeyond ? 'add' : 'remove']('is-beyond');
        });

        state = {isFixed, isBeyond};
      }
    });
  }

  return coverEl;
};

function transformSection(section) {
  const isDocked = section.suffix.indexOf('docked') > -1;
  const isPiecemeal = section.suffix.indexOf('piecemeal') > -1;
  const [, alignment] = section.suffix.match(ALIGNMENT_PATTERN) || [];
  const [, smRatio] = section.suffix.match(Picture.SM_RATIO_PATTERN) || [];
  const [, mdRatio] = section.suffix.match(Picture.MD_RATIO_PATTERN) || [];
  const [, lgRatio] = section.suffix.match(Picture.LG_RATIO_PATTERN) || [];
  let sourceMediaEl;

  const config = section.betweenNodes.reduce((config, node) => {
    let classList;
    let videoId;
    let imgEl;

    if (!config.videoId && !config.imgEl && isElement(node) ) {
      classList = node.className.split(' ');

      videoId = (
        (classList.indexOf('inline-content') > -1 && classList.indexOf('video') > -1) ||
        (classList.indexOf('view-inlineMediaPlayer') > -1) ||
        (classList.indexOf('embed-content') > -1 && $('.type-video', node))
      ) && url2cmid($('a', node).getAttribute('href'));

      if (videoId) {
        config.videoId = videoId;
      } else {
        imgEl = $('img', node);

        if (imgEl) {
          config.imgEl = imgEl;
        }
      }

      if (videoId || imgEl) {
        sourceMediaEl = node;
      }
    }

    if (
      !videoId &&
      !imgEl &&
      isElement(node) &&
      (node.hasAttribute('name') || trim(node.textContent).length > 0)
    ) {
      config.contentEls.push(node);
    }

    return config;
  }, {
    isDocked,
    isPiecemeal,
    alignment,
    smRatio,
    mdRatio,
    lgRatio,
    contentEls: []
  });

  if (
    config.contentEls.length === 1 &&
    config.contentEls[0].tagName === 'H2'
  ) {
    config.type = 'heading';
  }

  section.substituteWith(Cover(config), sourceMediaEl ? [sourceMediaEl] : []);
}

module.exports = Cover;
module.exports.transformSection = transformSection;
