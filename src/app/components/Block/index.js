// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const { ALIGNMENT_PATTERN, SCROLLPLAY_PCT_PATTERN, VIDEO_MARKER_PATTERN } = require('../../../constants');

const { enqueue, subscribe } = require('../../scheduler');
const { $, detach, getChildImage, isElement } = require('../../utils/dom');
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

/*
  Block media can be one of:

  * imageEl - an image document
  * videoId - a video document CMID or a Youtube video ID (when isVideoYouTube=true)
  * backgrounds - an array of acceptable values for imageEl/videoId
  
  Media may be captioned/attributed, in which case a captions array (of Caption components) should be supplied
*/
function Block({
  alignment,
  backgrounds,
  captionEls = [],
  contentEls = [],
  hasInsetMedia,
  hasHiddenCaptionTitles,
  imgEl,
  isContained,
  isDocked,
  isGrouped,
  isLight,
  isPiecemeal,
  isVideoYouTube,
  ratios = {},
  shouldVideoPlayOnce,
  videoScrollplayPct,
  transition,
  videoId
}) {
  if (contentEls.length === 1) {
    isPiecemeal = true;
  }

  if (hasInsetMedia) {
    isDocked = true;
    alignment = alignment || 'right';
  }

  const className = cn(
    'Block',
    {
      'has-hidden-caption-titles': hasHiddenCaptionTitles,
      'has-inset-media': hasInsetMedia,
      [`has-${alignment}`]: alignment,
      'has-dark': !isLight,
      'has-light': isLight,
      'is-not-piecemeal': !isPiecemeal,
      'is-piecemeal': isPiecemeal
    },
    'u-full'
  );
  const mediaClassName = cn('Block-media', {
    'is-fixed': !isDocked
  });
  const mediaCaptionClassName = 'Block-mediaCaption';
  const contentClassName = `Block-content${alignment ? ` is-${alignment}` : ''} u-richtext${isLight ? '' : '-invert'}`;

  ratios = {
    sm: ratios.sm || '3x4',
    md: ratios.md || '1x1',
    lg: ratios.lg,
    xl: ratios.xl
  };

  let mediaEl;

  if (backgrounds) {
    backgrounds = backgrounds.map(element => {
      // Try to resolve the background element
      let backgroundEl;
      if (element.tagName === 'IMG') {
        backgroundEl = Picture({
          src: element.src,
          alt: element.getAttribute('alt'),
          ratios
        });
      } else if (element.videoId) {
        if (element.isVideoYouTube) {
          backgroundEl = YouTubePlayer({
            videoId: element.videoId,
            ratios,
            isLoop: shouldVideoPlayOnce ? false : undefined,
            isAmbient: true,
            isContained
          });
        } else {
          backgroundEl = VideoPlayer({
            videoId: element.videoId,
            ratios,
            isContained,
            isLoop: shouldVideoPlayOnce ? false : undefined,
            isInvariablyAmbient: true
          });
        }
      }

      backgroundEl.classList.add('background-transition');
      if (TRANSITIONS.indexOf(transition) > -1) {
        backgroundEl.classList.add(transition);
      } else {
        backgroundEl.classList.add('colour');
      }

      return backgroundEl;
    });
  } else if (imgEl) {
    const src = imgEl.src;
    const alt = imgEl.getAttribute('alt');

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
        ratios,
        scrollplayPct: videoScrollplayPct,
        isLoop: shouldVideoPlayOnce || typeof videoScrollplayPct === 'number' ? false : undefined,
        isAmbient: true,
        isContained
      });
    } else {
      mediaEl = VideoPlayer({
        videoId,
        ratios,
        scrollplayPct: videoScrollplayPct,
        isContained: isContained,
        isLoop: shouldVideoPlayOnce || typeof videoScrollplayPct === 'number' ? false : undefined,
        isInvariablyAmbient: true
      });
    }
  }

  let mediaContainerEl;
  if (backgrounds && backgrounds.length) {
    mediaContainerEl = html`
      <div class="${mediaClassName}">${backgrounds}</div>
    `;
  } else {
    mediaContainerEl = mediaEl
      ? html`
          <div class="${mediaClassName}">${mediaEl}</div>
        `
      : null;
  }

  const mediaCaptionContainerEl = html`
    <div class="${mediaCaptionClassName}">${captionEls[0] || null}</div>
  `;

  if (captionEls.length) {
    mediaContainerEl.appendChild(mediaCaptionContainerEl);
  }

  const blockEl = html`
    <div class="${className}">
      ${mediaContainerEl}
      ${isPiecemeal
        ? contentEls.reduce((memo, contentEl) => {
            const piecemeallAlignment = contentEl.getAttribute('data-alignment');
            const piecemealBackgroundIndex = contentEl.getAttribute('data-background-index');
            const piecemealLightDark = contentEl.getAttribute('data-lightdark');
            let piecemealContentClassName = contentClassName;

            // Override the light/dark from the Block if a marker was given
            if (piecemealLightDark) {
              piecemealContentClassName = piecemealContentClassName.replace(
                /\su-richtext(-invert)?/,
                ` u-richtext${piecemealLightDark === 'light' ? '' : '-invert'}`
              );
            }

            // Override the left/right from the Block if marker has it
            if (piecemeallAlignment) {
              piecemealContentClassName = piecemealContentClassName.replace(
                /\sis-(left|right)/,
                `${piecemeallAlignment === 'center' ? '' : ` is-${piecemeallAlignment}`}`
              );
            }

            if (memo.length === 0 || !isGrouped || (piecemealBackgroundIndex && piecemealBackgroundIndex.length)) {
              memo.push(html`
                <div class="${piecemealContentClassName}">${contentEl}</div>
              `);
            } else {
              memo[memo.length - 1].appendChild(contentEl);
            }

            return memo;
          }, [])
        : contentEls.length > 0
        ? html`
            <div class="${contentClassName}">${contentEls}</div>
          `
        : null}
    </div>
  `;

  if (mediaContainerEl && isDocked) {
    let state = {};

    subscribe(function _checkIfBlockPropertiesShouldBeUpdated(client) {
      const rect = blockEl.getBoundingClientRect();
      const isBeyond = client.fixedHeight >= rect.bottom;
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

  if (backgrounds && backgrounds.length) {
    // In theory, this could be any colour
    if (transition.length === 6 && transition.match(/^[0-9a-f]{6}$/)) {
      blockEl.style.setProperty('background-color', '#' + transition);
    }

    // keep a list of marked nodes for switching backgrounds
    let markers = contentEls.filter(element => element.getAttribute('data-background-index'));
    let activeIndex = -1;
    let previousActiveIndex = -1;

    // keep a list of light/dark for each marker, so captions have the correct theme
    const lightDarkForMarkerIndex = markers.map(
      (element, index) => element.getAttribute('data-lightdark') || (isLight ? 'light' : 'dark')
    );

    subscribe(function _checkIfBackgroundShouldChange(client) {
      // get the last marker that has a bottom above the fold
      const marker = markers.reduce((activeMarker, currentMarker) => {
        const { top } = currentMarker.getBoundingClientRect();
        if (top > client.fixedHeight * 0.8) return activeMarker;

        return currentMarker;
      }, markers[0]);

      const newActiveIndex = parseInt(marker.getAttribute('data-background-index'), 10);

      if (activeIndex !== newActiveIndex) {
        previousActiveIndex = activeIndex;
        activeIndex = newActiveIndex;

        enqueue(function _updateBackground() {
          backgrounds.forEach((background, index) => {
            // Only keep the previous 1 and next 1 in the context
            if (index >= activeIndex - 1 && index <= activeIndex + 1) {
              background.style.removeProperty('display');
            } else {
              background.style.setProperty('display', 'none');
            }

            // Transition between the images
            if (index === activeIndex) {
              background.style.removeProperty('visibility');
              background.classList.add('transition-in');
              background.classList.remove('transition-out');
            } else if (index === previousActiveIndex) {
              background.style.removeProperty('visibility');
              background.classList.add('transition-out');
              background.classList.remove('transition-in');
            } else {
              background.style.setProperty('visibility', 'hidden');
              background.classList.remove('transition-in');
              background.classList.remove('transition-out');
            }
          });

          // Update container 'has-(dark|light)' className modfifiers
          const activeLightDark = lightDarkForMarkerIndex[activeIndex];
          blockEl.classList[activeLightDark === 'dark' ? 'add' : 'remove']('has-dark');
          blockEl.classList[activeLightDark === 'light' ? 'add' : 'remove']('has-light');

          // Update caption
          if (mediaCaptionContainerEl.firstChild) {
            mediaCaptionContainerEl.removeChild(mediaCaptionContainerEl.firstChild);
          }
          if (captionEls[activeIndex]) {
            mediaCaptionContainerEl.appendChild(captionEls[activeIndex]);
          }

          // Ensure that newly visible images have their object-fit properties polyfilled in IE11
          if (window.objectFitPolyfill) {
            window.objectFitPolyfill();
          }
        });
      }
    });
  }

  return blockEl;
}

function transformSection(section) {
  const hasAttributedMedia = section.configSC.indexOf('attributed') > -1;
  const hasCaptionedMedia = section.configSC.indexOf('captioned') > -1;
  const hasInsetMedia = section.configSC.indexOf('inset') > -1;
  const isContained = section.configSC.indexOf('contain') > -1;
  const isDocked = section.configSC.indexOf('docked') > -1;
  const isGrouped = section.configSC.indexOf('grouped') > -1;
  const isLight = section.configSC.indexOf('light') > -1;
  const isPiecemeal = section.configSC.indexOf('piecemeal') > -1;
  const shouldSupplant = section.configSC.indexOf('supplant') > -1;
  const shouldVideoPlayOnce = section.configSC.indexOf('once') > -1;
  const [, videoScrollplayPctString] = section.configSC.match(SCROLLPLAY_PCT_PATTERN) || [, ''];
  const videoScrollplayPct =
    videoScrollplayPctString.length > 0 && Math.max(0, Math.min(100, +videoScrollplayPctString));

  let transition;

  if (!hasInsetMedia) {
    TRANSITIONS.forEach(t => {
      if (section.configSC.indexOf('transition' + t) > -1) {
        if (t === 'colour') {
          transition = section.configSC.match(/colour([a-f0-9]+)/)[1];
        } else {
          transition = t;
        }
      }
    });
  }
  // fallback for just basic default transition or if we have inset transitioning media
  if (!transition && section.configSC.indexOf('transition') > -1) {
    transition = 'black';
  }

  const [, alignment] =
    section.configSC
      .replace('slideright', '')
      .replace('slideleft', '')
      .match(ALIGNMENT_PATTERN) || [];
  let sourceMediaEl;

  if (shouldSupplant && section.betweenNodes.length) {
    detach(section.betweenNodes.shift());
  }

  const hasHiddenCaptionTitles = hasAttributedMedia && !hasCaptionedMedia;

  let config = {
    alignment,
    captionEls: [],
    contentEls: [],
    hasAttributedMedia,
    hasHiddenCaptionTitles,
    hasInsetMedia,
    isContained,
    isDocked,
    isGrouped,
    isLight,
    isPiecemeal,
    shouldVideoPlayOnce,
    videoScrollplayPct
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
        let img = getChildImage(node);
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

          // Add the caption, if one exists
          if (hasAttributedMedia || hasCaptionedMedia) {
            config.captionEls.push(Caption.createFromEl(node, true));
          }

          return null;
        }

        // See if we have a video we can use for a background
        let videoMarker = {};
        if (node.name && !!node.name.match(VIDEO_MARKER_PATTERN)) {
          videoMarker = {
            isVideoYouTube: node.name.split('youtube')[1],
            videoId: node.name.match(VIDEO_MARKER_PATTERN)[1]
          };
        } else {
          videoMarker.videoId = detectVideoId(node);
        }

        if (videoMarker.videoId) {
          // We found a video to use as one of the backgrounds
          config.backgrounds.push(videoMarker);
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

          // Add a non-caption, to keep the background:caption indices in sync
          if (hasAttributedMedia || hasCaptionedMedia) {
            config.captionEls.push(null);
          }

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

          // Blocks with transitioning inset media always have left aligned text, so skip alignment checks
          if (!hasInsetMedia) {
            if (config.indexOf('left') > -1) {
              leftRightConfig = 'left';
            }
            if (config.indexOf('right') > -1) {
              leftRightConfig = 'right';
            }
            if (config.indexOf('center') > -1) {
              leftRightConfig = 'center';
            }
          }

          // If an image gave us this config we can pass it onto the actual paragraph
          if (node.hasAttribute('data-background-index')) {
            node.nextElementSibling.setAttribute('data-background-index', node.getAttribute('data-background-index'));
          }

          // Remove this anchor from the flow
          node.parentElement.removeChild(node);
          return null;
        } else if (node.tagName && node.tagName === 'A') {
          // Remove any extra orphan anchor tags
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
    // Transitions are not being used so business as usual
    config = section.betweenNodes.reduce((_config, node) => {
      let videoId;
      let imgEl;

      if (!_config.videoId && !_config.imgEl && isElement(node)) {
        classList = node.className.split(' ');

        if (node.name && !!node.name.match(VIDEO_MARKER_PATTERN)) {
          _config.isVideoYouTube = node.name.split('youtube')[1];
          _config.videoId = videoId = node.name.match(VIDEO_MARKER_PATTERN)[1];
        } else {
          videoId = detectVideoId(node);
        }

        if (videoId) {
          _config.videoId = videoId;
        } else {
          imgEl = getChildImage(node);

          if (imgEl) {
            _config.imgEl = imgEl;
            _config.ratios = getRatios(section.configSC);
          }
        }

        if (videoId || imgEl) {
          sourceMediaEl = node;
          if (hasAttributedMedia || hasCaptionedMedia) {
            _config.captionEls.push(Caption.createFromEl(node, true));
          }
        }
      }

      if (!videoId && !imgEl && isElement(node) && (node.hasAttribute('name') || trim(node.textContent).length > 0)) {
        _config.contentEls.push(node);
      }

      return _config;
    }, config);
  }

  section.substituteWith(Block(config), sourceMediaEl ? [sourceMediaEl] : []);
}

function detectVideoId(node) {
  let classList = node.className.split(' ');
  const linkEl = $('a[href]', node);

  return (
    linkEl &&
    ((classList.indexOf('inline-content') > -1 && classList.indexOf('video') > -1) ||
      (classList.indexOf('view-inlineMediaPlayer') > -1 && classList.indexOf('doctype-abcvideo') > -1) ||
      (classList.indexOf('embed-content') > -1 && $('.type-video', node))) &&
    url2cmid(linkEl.getAttribute('href'))
  );
}

module.exports = Block;
module.exports.transformSection = transformSection;
