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

const TRANSITIONS = [
  'colour',
  'crossfade',
  'zoomfade',
  'bouncefade',
  'slideup',
  'slidedown',
  'slideright',
  'slideleft',
  'shuffle'
];

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
  contentEls = [],
  transition,
  backgrounds
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

  if (backgrounds) {
    // const productionUnit = document.querySelector('meta[name="ABC.productionUnit"]');
    // if (!productionUnit || productionUnit.getAttribute('content') !== 'Interactive Digital Storytelling team') {
    //   alert(
    //     "In order to use Block transitions you need to set the production unit to 'Interactive Digital Storytelling team'."
    //   );

    //   transition = null;
    //   backgrounds = [];
    // }

    backgrounds = backgrounds.map(img => {
      const src = img.src;
      const alt = img.getAttribute('alt');
      const id = url2cmid(src);

      const picture = Picture({
        src,
        alt,
        ratios
      });

      picture.classList.add('background-transition');
      if (TRANSITIONS.indexOf(transition) > -1) {
        picture.classList.add(transition);
      } else {
        picture.classList.add('colour');
      }

      return picture;
    });
  } else if (imgEl) {
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

  let mediaContainerEl;
  if (backgrounds) {
    mediaContainerEl = html`
      <div class="${mediaClassName}">
        ${backgrounds}
      </div>`;
  } else {
    mediaContainerEl = mediaEl
      ? html`
      <div class="${mediaClassName}">
        ${mediaEl}
      </div>
    `
      : null;
  }

  const blockEl = html`
    <div class="${className}">
      ${mediaContainerEl}
      ${
        isPiecemeal
          ? contentEls.map(contentEl => {
              let actualContentClassName = contentClassName;

              // Override the light/dark from the Block if a marker was given
              switch (contentEl.getAttribute('data-lightdark')) {
                case 'light':
                  actualContentClassName = actualContentClassName.replace('u-richtext-invert', 'u-richtext');
                  break;
                case 'dark':
                  actualContentClassName = actualContentClassName.replace('u-richtext', 'u-richtext-invert');
                  break;
              }

              // Override the left/right from the Block if marker has it
              switch (contentEl.getAttribute('data-alignment')) {
                case 'left':
                  actualContentClassName = actualContentClassName += ' is-left';
                  break;
                case 'right':
                  actualContentClassName = actualContentClassName += ' is-right';
                  break;
                case 'center':
                  actualContentClassName = actualContentClassName += ' is-center';
                  break;
              }

              return html`<div class="${actualContentClassName}">${contentEl}</div>`;
            })
          : contentEls.length > 0
            ? html`<div class="${contentClassName}">${contentEls}</div>`
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

  if (backgrounds) {
    // In theory, this could be any colour
    // if (transition === 'white') {
    if (transition.length === 6 && transition.match(/^[0-9a-f]{6}$/)) {
      blockEl.style.setProperty('background-color', '#' + transition);
    }

    // keep a list of marked nodes for switching backgrounds
    let markers = contentEls.filter(element => element.getAttribute('data-background-index'));
    let activeIndex = -1;

    subscribe(function _checkIfBackgroundShouldChange(client) {
      // get the last marker that has a bottom above the fold
      const marker = markers.reduce((activeMarker, currentMarker) => {
        const { top } = currentMarker.getBoundingClientRect();
        if (top > window.innerHeight * 0.8) return activeMarker;

        return currentMarker;
      }, markers[0]);

      const newActiveIndex = parseInt(marker.getAttribute('data-background-index'), 10);
      if (activeIndex !== newActiveIndex) {
        activeIndex = newActiveIndex;

        enqueue(function _updateBackground() {
          backgrounds.forEach((background, index) => {
            // Only keep the previous 2 and next 2 in the context
            if (index > activeIndex - 2 && index < activeIndex + 2) {
              background.style.removeProperty('display');
            } else {
              background.style.setProperty('display', 'none');
            }

            // Transition between the images
            if (index === activeIndex) {
              background.classList.add('transition-in');
              background.classList.remove('transition-out');
            } else {
              background.classList.add('transition-out');
              background.classList.remove('transition-in');
            }
          });
        });
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

  let transition;
  TRANSITIONS.forEach(t => {
    if (section.configSC.indexOf('transition' + t) > -1) {
      if (t === 'colour') {
        transition = section.configSC.match(/colour([a-f0-9]+)/)[1];
      } else {
        transition = t;
      }
    }
  });
  // fallback for just basic default transition
  if (!transition && section.configSC.indexOf('transition') > -1) {
    transition = 'black';
  }

  const [, alignment] = section.configSC.match(ALIGNMENT_PATTERN) || [];
  let sourceMediaEl;

  if (shouldSupplant && section.betweenNodes.length) {
    detach(section.betweenNodes.shift());
  }

  let config = {
    isContained,
    isDocked,
    isPiecemeal,
    isLight,
    alignment,
    contentEls: []
  };

  // if the 'transition' flag is set then assume its a slide show
  // extract all images as  media elements
  // graft a 'marker' property onto the next sibling to know where this image came from

  if (transition) {
    let lightDarkConfig;
    let leftRightConfig;

    // If transitions are enabled then we can extract any images from the block
    // for use as backgrounds
    config.transition = transition;
    config.backgrounds = [];
    config.contentEls = section.betweenNodes
      .map(node => {
        let img = $('img', node);

        if (img) {
          // We found an image to use as one of the backgrounds
          config.backgrounds.push(img);
          config.ratios = getRatios(section.configSC);

          // Graft a 'marker' onto the next paragraph
          if (node.nextElementSibling) {
            node.nextElementSibling.setAttribute('data-background-index', config.backgrounds.length - 1);
          }

          // Reset the light/dark left/right setter
          lightDarkConfig = null;
          leftRightConfig = null;

          // Remove this image from the flow
          node.parentElement.removeChild(node);
          return null;
        }

        if (node.tagName && node.tagName === 'A' && (node.getAttribute('name') || '').indexOf('mark') === 0) {
          const config = node.getAttribute('name').replace('mark', '');
          if (config.indexOf('light') > -1) {
            lightDarkConfig = 'light';
          }
          if (config.indexOf('dark') > -1) {
            lightDarkConfig = 'dark';
          }

          if (config.indexOf('left') > -1) {
            leftRightConfig = 'left';
          }
          if (config.indexOf('right') > -1) {
            leftRightConfig = 'right';
          }
          if (config.indexOf('center') > -1) {
            leftRightConfig = 'center';
          }

          // If an image gave us this config we can pass it onto the actual paragraph
          if (node.hasAttribute('data-background-index')) {
            node.nextElementSibling.setAttribute('data-background-index', node.getAttribute('data-background-index'));
          }

          // Remove this anchor from the flow
          node.parentElement.removeChild(node);
          return null;
        }

        if (node.tagName) {
          if (lightDarkConfig) {
            node.setAttribute('data-lightdark', lightDarkConfig);
          }
          if (leftRightConfig) {
            node.setAttribute('data-alignment', leftRightConfig);
          }
        }

        return node;
      })
      .filter(n => n);
  } else {
    // Transitions is not enabled to business as usual
    config = section.betweenNodes.reduce((_config, node) => {
      let classList;
      let videoId;
      let imgEl;

      if (!_config.videoId && !_config.imgEl && isElement(node)) {
        classList = node.className.split(' ');

        if (node.name && !!node.name.match(VIDEO_MARKER_PATTERN)) {
          _config.isVideoMarker = true;
          _config.isVideoYouTube = node.name.split('youtube')[1];
          _config.videoElOrId = videoId = node.name.match(VIDEO_MARKER_PATTERN)[1];
        } else {
          videoId =
            ((classList.indexOf('inline-content') > -1 && classList.indexOf('video') > -1) ||
              classList.indexOf('view-inlineMediaPlayer') > -1 ||
              (classList.indexOf('embed-content') > -1 && $('.type-video', node))) &&
            url2cmid($('a', node).getAttribute('href'));
        }

        if (videoId) {
          _config.videoId = videoId;
        } else {
          imgEl = $('img', node);

          if (imgEl) {
            _config.imgEl = imgEl;
            _config.ratios = getRatios(section.configSC);
          }
        }

        if (videoId || imgEl) {
          sourceMediaEl = node;
        }
      }

      if (!videoId && !imgEl && isElement(node) && (node.hasAttribute('name') || trim(node.textContent).length > 0)) {
        _config.contentEls.push(node);
      }

      return _config;
    }, config);
  }

  if (config.contentEls.length === 1 && config.contentEls[0].tagName === 'H2') {
    config.type = 'heading';
  }

  section.substituteWith(Block(config), sourceMediaEl ? [sourceMediaEl] : []);
}

module.exports = Block;
module.exports.transformSection = transformSection;
