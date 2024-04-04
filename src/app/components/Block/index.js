import { getMountValue, isMount } from '@abcnews/mount-utils';
import cn from 'classnames';
import html from 'nanohtml';
import { ALIGNMENT_PATTERN, SCROLLPLAY_PCT_PATTERN, VIDEO_MARKER_PATTERN } from '../../constants';
import { enqueue, subscribe } from '../../scheduler';
import { detach, detectVideoId, getChildImage, isElement } from '../../utils/dom';
import { getRatios } from '../../utils/misc';
import { createFromElement as createCaptionFromElement } from '../Caption';
import Picture from '../Picture';
import VideoPlayer from '../VideoPlayer';
import YouTubePlayer from '../YouTubePlayer';
import styles from './index.lazy.scss';

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

  * imgEl - an image document
  * videoId - a video document CMID or a Youtube video ID (when isVideoYouTube=true)
  * backgrounds - an array of acceptable values for imgEl/videoId

  Media may be captioned/attributed, in which case captionEls (an array of Caption components) should be supplied
*/
const Block = ({
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
  isPhoneFrame,
  isVideoYouTube,
  ratios = {},
  shouldVideoPlayOnce,
  videoScrollplayPct,
  transition,
  videoId
}) => {
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
  let backgroundsEls;

  if (backgrounds) {
    backgroundsEls = backgrounds.map(background => {
      // Try to resolve the background element
      let backgroundEl = document.createElement('div'); // placeholder

      if (background.tagName === 'IMG') {
        backgroundEl = Picture({
          src: background.src,
          alt: background.getAttribute('alt'),
          ratios
        });
      } else if (background.videoId) {
        if (background.isVideoYouTube) {
          backgroundEl = YouTubePlayer({
            videoId: background.videoId,
            ratios,
            isLoop: shouldVideoPlayOnce ? false : undefined,
            isAmbient: true,
            isContained
          });
        } else {
          backgroundEl = VideoPlayer({
            videoId: background.videoId,
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
  if (backgroundsEls && backgroundsEls.length) {
    if (isPhoneFrame) {
      mediaContainerEl = html`<div class="${mediaClassName}"><div class="phone-frame">${backgroundsEls}</div></div>`;
    } else {
      mediaContainerEl = html`<div class="${mediaClassName}">${backgroundsEls}</div>`;
    }
  } else {
    // Wrap in extra div to pop it in a phone frame
    if (isPhoneFrame) {
      mediaEl = html`<div class="phone-frame">${mediaEl}</div>`;
    }

    mediaContainerEl = mediaEl ? html`<div class="${mediaClassName}">${mediaEl}</div>` : null;
  }

  const mediaCaptionContainerEl = html`<div class="${mediaCaptionClassName}">${captionEls[0] || null}</div>`;

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
              memo.push(html`<div class="${piecemealContentClassName}">${contentEl}</div>`);
            } else {
              memo[memo.length - 1].appendChild(contentEl);
            }

            return memo;
          }, [])
        : contentEls.length > 0
        ? html`<div class="${contentClassName}">${contentEls}</div>`
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

  if (backgroundsEls && backgroundsEls.length) {
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
      element => element.getAttribute('data-lightdark') || (isLight ? 'light' : 'dark')
    );

    subscribe(function _checkIfBackgroundShouldChange(client) {
      // provide an out if the block is incorrectly configured
      if (markers.length === 0) {
        return console.error('Expected to find an active marker during _checkIfBackgroundShouldChange');
      }

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
          backgroundsEls.forEach((backgroundEl, index) => {
            // Only keep the previous 1 and next 1 in the context
            if (index >= activeIndex - 1 && index <= activeIndex + 1) {
              backgroundEl.style.removeProperty('display');
            } else {
              backgroundEl.style.setProperty('display', 'none');
            }

            // Transition between the images
            if (index === activeIndex) {
              backgroundEl.style.removeProperty('visibility');
              backgroundEl.classList.add('transition-in');
              backgroundEl.classList.remove('transition-out');
            } else if (index === previousActiveIndex) {
              backgroundEl.style.removeProperty('visibility');
              backgroundEl.classList.add('transition-out');
              backgroundEl.classList.remove('transition-in');
            } else {
              backgroundEl.style.setProperty('visibility', 'hidden');
              backgroundEl.classList.remove('transition-in');
              backgroundEl.classList.remove('transition-out');
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
        });
      }
    });
  }

  styles.use();

  return blockEl;
};

export default Block;

export const transformSection = section => {
  const hasAttributedMedia = section.configString.indexOf('attributed') > -1;
  const hasCaptionedMedia = section.configString.indexOf('captioned') > -1;
  const hasInsetMedia = section.configString.indexOf('inset') > -1;
  const isContained = section.configString.indexOf('contain') > -1;
  const isDocked = section.configString.indexOf('docked') > -1;
  const isGrouped = section.configString.indexOf('grouped') > -1;
  const isLight = section.configString.indexOf('light') > -1;
  const isPiecemeal = section.configString.indexOf('piecemeal') > -1;
  const isPhoneFrame = section.configString.indexOf('phoneframe') > -1;
  const shouldSupplant = section.configString.indexOf('supplant') > -1;
  const shouldVideoPlayOnce = section.configString.indexOf('once') > -1;
  const [, videoScrollplayPctString] = section.configString.match(SCROLLPLAY_PCT_PATTERN) || [, ''];
  const videoScrollplayPct =
    videoScrollplayPctString.length > 0 && Math.max(0, Math.min(100, +videoScrollplayPctString));

  let transition;

  if (!hasInsetMedia) {
    TRANSITIONS.forEach(t => {
      if (section.configString.indexOf('transition' + t) > -1) {
        if (t === 'colour') {
          transition = section.configString.match(/colour([a-f0-9]+)/)[1];
        } else {
          transition = t;
        }
      }
    });
  }
  // fallback for just basic default transition or if we have inset transitioning media
  if (!transition && section.configString.indexOf('transition') > -1) {
    transition = 'black';
  }

  const [, alignment] =
    section.configString.replace('slideright', '').replace('slideleft', '').match(ALIGNMENT_PATTERN) || [];
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
    isPhoneFrame,
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
        const mountValue = isMount(node) ? getMountValue(node) : '';
        const isVideoMarker = !!mountValue.match(VIDEO_MARKER_PATTERN);
        const videoId = isVideoMarker ? mountValue.match(VIDEO_MARKER_PATTERN)[1] : detectVideoId(node);
        const imgEl = getChildImage(node);

        // The video player DOM has an image element descentdent, so check it's not a video
        // before assuming it's an image.
        if (imgEl && !videoId) {
          // We found an image to use as one of the backgrounds
          config.backgrounds.push(imgEl);
          config.ratios = getRatios(section.configString);

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
            config.captionEls.push(createCaptionFromElement(node, true));
          }

          return null;
        }

        // See if we have a video we can use for a background
        let videoMarker = { videoId };

        if (isVideoMarker) {
          videoMarker.isVideoYouTube = !!mountValue.split('youtube')[1];
        }

        if (videoMarker.videoId) {
          // We found a video to use as one of the backgrounds
          config.backgrounds.push(videoMarker);
          config.ratios = getRatios(section.configString);

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
            config.captionEls.push(createCaptionFromElement(node, true));
          }

          return null;
        }

        if (isMount(node, 'mark')) {
          const config = getMountValue(node, 'mark');

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

          // Remove this mount from the flow
          node.parentElement.removeChild(node);
          return null;
        } else if (isMount(node)) {
          // Remove any extra orphan mount tags
          return null;
        }

        if (isElement(node)) {
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
        const mountValue = isMount(node) ? getMountValue(node) : '';

        if (!!mountValue.match(VIDEO_MARKER_PATTERN)) {
          _config.isVideoYouTube = !!mountValue.split('youtube')[1];
          _config.videoId = videoId = mountValue.match(VIDEO_MARKER_PATTERN)[1];
        } else {
          videoId = detectVideoId(node);
        }

        if (videoId) {
          _config.videoId = videoId;
        } else {
          imgEl = getChildImage(node);

          if (imgEl) {
            _config.imgEl = imgEl;
            _config.ratios = getRatios(section.configString);
          }
        }

        if (videoId || imgEl) {
          sourceMediaEl = node;
          if (hasAttributedMedia || hasCaptionedMedia) {
            _config.captionEls.push(createCaptionFromElement(node, true));
          }
        }
      }

      if (!videoId && !imgEl && isElement(node)) {
        _config.contentEls.push(node);
      }

      return _config;
    }, config);
  }

  section.substituteWith(Block(config), sourceMediaEl ? [sourceMediaEl] : []);
};
