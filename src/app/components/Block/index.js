// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const { ALIGNMENT_PATTERN, VIDEO_MARKER_PATTERN, IS_PREVIEW } = require('../../../constants');
const { enqueue, invalidateClient, subscribe } = require('../../scheduler');
const { $, detach, isElement, substitute } = require('../../utils/dom');
const { getRatios, trim } = require('../../utils/misc');
const Caption = require('../Caption');
const Picture = require('../Picture');
const VideoPlayer = require('../VideoPlayer');
const YouTubePlayer = require('../YouTubePlayer');
require('./index.scss');

function Block({
  type = 'richtext',
  isContained,
  isDocked,
  isPiecemeal,
  isLight,
  alignment,
  videoId,
  isVideoMarker,
  isVideoYouTube,
  imgEl,
  ratios = {},
  contentEls = []
}) {
  const className = cn(
    'Block',
    `is-${type}`,
    {
      'is-piecemeal': type === 'richtext' && isPiecemeal,
      [`is-${alignment}`]: alignment
    },
    'u-full'
  );
  const mediaClassName = cn('Block-media', {
    'u-parallax': type === 'heading',
    'is-fixed': type === 'richtext' && !isDocked
  });
  const contentClassName = `Block-content u-layout u-richtext${isLight ? '' : '-invert'}`;

  ratios = {
    sm: ratios.sm || (type === 'heading' ? '3x2' : '3x4'),
    md: ratios.md || (type === 'heading' ? '16x9' : '1x1'),
    lg: ratios.lg
  };

  let mediaEl;

  if (imgEl) {
    const src = imgEl.src;
    const alt = imgEl.getAttribute('alt');
    const id = url2cmid(src);

    mediaEl = Picture({
      src,
      alt,
      isContained,
      ratios
    });
  } else if (videoId) {
    if (isVideoYouTube) {
      mediaEl = YouTubePlayer({
        videoId,
        isAmbient: true,
        isContained,
        ratios
      });
    } else {
      mediaEl = html`<div></div>`;
      VideoPlayer[`getMetadata${isVideoMarker ? 'FromDetailPage' : ''}`](videoId, (err, metadata) => {
        if (err) {
          return;
        }

        const replacementMediaEl = VideoPlayer(
          Object.assign(metadata, {
            ratios,
            isAmbient: true,
            isContained: isContained
          })
        );

        substitute(mediaEl, replacementMediaEl);
        invalidateClient();
      });
    }
  }

  const mediaContainerEl = mediaEl
    ? html`
    <div class="${mediaClassName}">
      ${mediaEl}
    </div>
  `
    : null;

  const blockEl = html`
    <div class="${className}">
      ${mediaContainerEl}
      ${
        isPiecemeal
          ? contentEls.map(
              contentEl => html`
          <div class="${contentClassName}">
            ${contentEl}
          </div>
        `
            )
          : contentEls.length > 0
            ? html`
          <div class="${contentClassName}">
            ${contentEls}
          </div>
        `
            : null
      }
    </div>
  `;

  if (mediaContainerEl && type === 'richtext' && isDocked) {
    let state = {};

    subscribe(function _checkIfBlockPropertiesShouldBeUpdated(client) {
      const rect = blockEl.getBoundingClientRect();
      const isBeyond = client.height >= rect.bottom;
      const isFixed = !isBeyond && rect.top <= 0;

      if (isFixed !== state.isFixed || isBeyond !== state.isBeyond) {
        enqueue(function _updateBlockProperties() {
          mediaContainerEl.classList[isFixed ? 'add' : 'remove']('is-fixed');
          mediaContainerEl.classList[isBeyond ? 'add' : 'remove']('is-beyond');
        });

        state = { isFixed, isBeyond };
      }
    });
  }

  return blockEl;
}

function transformSection(section) {
  const isContained = section.configSC.indexOf('contain') > -1;
  const isDocked = section.configSC.indexOf('docked') > -1;
  const isPiecemeal = section.configSC.indexOf('piecemeal') > -1;
  const isLight = section.configSC.indexOf('light') > -1;
  const shouldSupplant = section.configSC.indexOf('supplant') > -1;
  const [, alignment] = section.configSC.match(ALIGNMENT_PATTERN) || [];
  let sourceMediaEl;

  if (shouldSupplant && section.betweenNodes.length) {
    detach(section.betweenNodes.shift());
  }

  const config = section.betweenNodes.reduce(
    (config, node) => {
      let classList;
      let videoId;
      let imgEl;

      if (!config.videoId && !config.imgEl && isElement(node)) {
        classList = node.className.split(' ');

        if (node.name && !!node.name.match(VIDEO_MARKER_PATTERN)) {
          config.isVideoMarker = true;
          config.isVideoYouTube = node.name.split('youtube')[1];
          config.videoElOrId = videoId = node.name.match(VIDEO_MARKER_PATTERN)[1];
        } else {
          videoId =
            ((classList.indexOf('inline-content') > -1 && classList.indexOf('video') > -1) ||
              classList.indexOf('view-inlineMediaPlayer') > -1 ||
              (classList.indexOf('embed-content') > -1 && $('.type-video', node))) &&
            url2cmid($('a', node).getAttribute('href'));
        }

        if (videoId) {
          config.videoId = videoId;
        } else {
          imgEl = $('img', node);

          if (imgEl) {
            config.imgEl = imgEl;
            config.ratios = getRatios(section.configSC);
          }
        }

        if (videoId || imgEl) {
          sourceMediaEl = node;
        }
      }

      if (!videoId && !imgEl && isElement(node) && (node.hasAttribute('name') || trim(node.textContent).length > 0)) {
        config.contentEls.push(node);
      }

      return config;
    },
    {
      isContained,
      isDocked,
      isPiecemeal,
      isLight,
      alignment,
      contentEls: []
    }
  );

  if (config.contentEls.length === 1 && config.contentEls[0].tagName === 'H2') {
    config.type = 'heading';
  }

  section.substituteWith(Block(config), sourceMediaEl ? [sourceMediaEl] : []);
}

module.exports = Block;
module.exports.transformSection = transformSection;
