// External
const cn = require('classnames');
const html = require('bel');
const rawHTML = require('bel/raw');
const url2cmid = require('util-url2cmid');

// Ours
const { REM, SELECTORS, SUPPORTS_PASSIVE, VIDEO_MARKER_PATTERN } = require('../../../constants');
const { getMeta } = require('../../meta');
const { enqueue, invalidateClient, subscribe } = require('../../scheduler');
const { $, append, detach, getChildImage, isElement, setText } = require('../../utils/dom');
const { dePx, getRatios, returnFalse } = require('../../utils/misc');
const Caption = require('../Caption');
const Picture = require('../Picture');
const Sizer = require('../Sizer');
const Quote = require('../Quote');
const VideoPlayer = require('../VideoPlayer');
require('./index.scss');

const MOSAIC_ROW_LENGTHS_PATTERN = /mosaic[a-z]*(\d+)/;
const DEFAULT_MOSAIC_SIZE_RATIOS = {
  sm: '1x1',
  md: '3x2',
  lg: '16x9',
  xl: '16x9'
};
const PCT_PATTERN = /(-?[0-9\.]+)%/;
const SWIPE_THRESHOLD = 25;
const AXIS_THRESHOLD = 5;
const INACTIVE_OPACITY = 0.2;
const PASSIVE_OPTIONS = { passive: true };
const CONTROL_ICON_MARKUP = `<svg role="presentation" viewBox="0 0 40 40">
  <polyline stroke="currentColor" stroke-width="2" fill="none" points="22.25 12.938 16 19.969 22.25 27" />
</svg>`;

function Gallery({ items = [], masterCaptionEl, mosaicRowLengths = [], isUnconstrained = false }) {
  let startItemsTransformXPct;
  let startX;
  let startY;
  let diffX;
  let diffY;
  let swipeAxis;
  let shouldIgnoreClicks;
  let currentIndex;
  let paneWidth;
  let itemHeight;
  let mediaEls;

  function updateItemsAppearance(xPct, isImmediate) {
    let wasOnEndCalled = false;

    if (isImmediate) {
      const onEnd = () => {
        if (!wasOnEndCalled) {
          enqueue(function _updateItemsAppearance_immediatePost() {
            itemsEl.removeEventListener('transitionend', onEnd);
            itemsEl.style.transitionDuration = '';
            mediaEls.forEach(mediaEl => (mediaEl.style.transitionDuration = ''));
          });
        }

        wasOnEndCalled = true;
      };

      enqueue(function _updateItemsAppearance_immediatePre() {
        itemsEl.style.transitionDuration = '0s, 0s';
        mediaEls.forEach(mediaEl => (mediaEl.style.transitionDuration = '0s'));
        itemsEl.addEventListener('transitionend', onEnd, false);
        setTimeout(onEnd, 500); // In case no transition is required
      });
    }

    enqueue(function _updateItemsAppearance() {
      itemsEl.style.transform = `translate3d(${xPct}%, 0, 0)`;

      mediaEls.forEach((mediaEl, index) => {
        mediaEl.style.opacity = offsetBasedOpacity(index, xPct);
      });
    });
  }

  function goToItem(index, isImmediate) {
    // Reset scroll position in case it was changed by browser focus() side-effect
    galleryEl.scrollLeft = 0;

    if (index < 0 || index >= items.length) {
      index = currentIndex;
    }

    itemEls[currentIndex].classList.remove('is-active');

    currentIndex = index;

    galleryEl.classList[index === 0 ? 'add' : 'remove']('is-at-start');
    galleryEl.classList[index === items.length - 1 ? 'add' : 'remove']('is-at-end');
    itemEls[currentIndex].classList.add('is-active');
    setText(indexEl, `${currentIndex + 1} / ${items.length}`);

    updateItemsAppearance(-currentIndex * 100, isImmediate);
    setTimeout(invalidateClient, 1000);
  }

  function pointerHandler(fn) {
    return function handler(event) {
      const _event = {
        type: event.type,
        preventDefault: event.preventDefault.bind(event),
        stopPropagation: event.stopPropagation.bind(event)
      };

      if (event.touches) {
        _event.clientX = event.touches[0].clientX;
        _event.clientY = event.touches[0].clientY;
      } else {
        _event.clientX = event.clientX;
        _event.clientY = event.clientY;
      }

      fn.call(this, _event);
    };
  }

  function swipeBegin(event) {
    if (isMosaic || startItemsTransformXPct != null) {
      return;
    }

    const [, xPct] = itemsEl.style.transform.match(PCT_PATTERN) || [
      ,
      (dePx(itemsEl.style.left || '0') / paneWidth) * 100
    ];

    startItemsTransformXPct = parseInt(xPct, 10);
    startX = event.clientX;
    startY = event.clientY;
    diffX = 0;
    diffY = 0;
    swipeAxis = null;

    itemsEl.style.transitionDuration = '0s';
  }

  function swipeUpdate(event) {
    if (startItemsTransformXPct == null || swipeAxis === 'vertical') {
      return;
    }

    diffX = event.clientX - startX;
    diffY = event.clientY - startY;

    if (!swipeAxis) {
      let absDiffX = Math.abs(diffX);
      let absDiffY = Math.abs(diffY);

      if (absDiffX > AXIS_THRESHOLD || absDiffY > AXIS_THRESHOLD) {
        swipeAxis = absDiffX < absDiffY ? 'vertical' : 'horizontal';
      }
    }

    if (swipeAxis === 'horizontal') {
      event.preventDefault();
      event.stopPropagation();

      itemsEl.classList.add('is-moving');
      updateItemsAppearance(startItemsTransformXPct + (diffX / paneWidth) * 100);
    }
  }

  function swipeIntent(event) {
    if (swipeAxis != null) {
      return;
    }

    const index = +this.getAttribute('data-index');

    if (index > currentIndex) {
      diffX = -(SWIPE_THRESHOLD + 1);
    } else if (index < currentIndex) {
      diffX = SWIPE_THRESHOLD + 1;
    }
  }

  function stopIfIgnoringClicks(event) {
    if (shouldIgnoreClicks) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function swipeComplete(event) {
    if (startItemsTransformXPct == null) {
      return;
    }

    let nextIndex = currentIndex;
    let absDiffX = Math.abs(diffX);

    if (absDiffX !== 0) {
      // Stop triggering mouse* events on multi-pointer devices
      event.preventDefault();
      event.stopPropagation();

      // Ignore click events for a small period to stop
      // secondary actions on swipes that originated on
      // a link or something else with an event handler
      if (galleryEl.className.indexOf('is-mosaic') === -1) {
        shouldIgnoreClicks = true;
        setTimeout(function() {
          shouldIgnoreClicks = false;
        }, 50);
      }

      if (absDiffX > SWIPE_THRESHOLD) {
        // Update the item index we'll be navigating to
        nextIndex = currentIndex - diffX / absDiffX;
      }
    }

    startItemsTransformXPct = null;
    startX = null;
    startY = null;
    diffX = null;
    diffY = null;
    swipeAxis = null;

    itemsEl.style.transitionDuration = '';
    itemsEl.classList.remove('is-moving');

    goToItem(nextIndex);
  }

  function measureDimensions(client) {
    if (!paneEl || (client && client.hasChanged === false)) {
      return;
    }

    const nextItemSizerEl = $('.Sizer', itemEls[currentIndex]);

    paneWidth = paneEl.getBoundingClientRect().width;

    if (!nextItemSizerEl) {
      return;
    }

    const nextItemHeight = nextItemSizerEl.getBoundingClientRect().height;

    if (nextItemHeight !== itemHeight) {
      itemHeight = nextItemHeight;

      enqueue(function _updateControlsPosition() {
        controlsEl.style.transform = `translateY(${itemHeight / REM}rem) translateY(-100%)`;
      });
    }
  }

  if (items.length === 0) {
    return html`
      <div class="Gallery is-empty"></div>
    `;
  }

  subscribe(measureDimensions);

  const isMosaic = mosaicRowLengths.length > 0;

  const className = cn(
    'Gallery',
    {
      'is-mosaic': isMosaic,
      'is-unconstrained': isUnconstrained /* only mosaic should be full bleed */
    },
    'u-full'
  );

  mosaicRowLengths = mosaicRowLengths.map(rowLength => Math.min(3, rowLength));

  const mosaicRowLengthsClone = [].concat(mosaicRowLengths);
  const mosaicRows = items.reduce(
    (memo, item, index) => {
      if (mosaicRowLengthsClone.length === 0) {
        mosaicRowLengthsClone.push(1);
      }

      memo[memo.length - 1].push(item);

      mosaicRowLengthsClone[0]--;

      if (mosaicRowLengthsClone[0] === 0) {
        mosaicRowLengthsClone.shift();

        if (index + 1 < items.length) {
          memo.push([]);
        }
      }

      return memo;
    },
    [[]]
  );

  mosaicRows.forEach(items => {
    items.forEach(item => {
      item.rowLength = items.length;
      item.flexBasisPct = 100 / item.rowLength;

      if (item.mosaicMediaEls) {
        item.mosaicMediaEls.forEach((el, index) => {
          if (index === item.rowLength - 1) {
            item.mosaicMediaEl = el;
          } else {
            // Unused Picture instances should be forgotten
            el.api && el.api.forget && el.api.forget();
          }
        });
      } else {
        item.mosaicMediaEl = item.mediaEl.cloneNode(true);
      }

      delete item.mosaicMediaEls;
    });
  });

  const itemEls = items.map(({ id, mediaEl, mosaicMediaEl, captionEl, flexBasisPct }, index) => {
    if (mediaEl.api && mediaEl.api.loaded) {
      // Because Picture instances have multiple possible aspect ratios,
      // they call `loadedHook` (if one exists) each time its <img> lazy-loads.
      mediaEl.api.loadedHook = imgEl => {
        imgEl.onload = measureDimensions;
        imgEl.setAttribute('draggable', 'false');
      };
    }

    const itemEl = html`
      <div
        class="Gallery-item"
        style="flex: 0 1 ${flexBasisPct}%; max-width: ${flexBasisPct}%"
        data-id="${id || 'n/a'}"
        data-index="${index}"
        tabindex="-1"
        ondragstart=${returnFalse}
        onmouseup=${swipeIntent}
        onclick=${stopIfIgnoringClicks}
      >
        ${mediaEl} ${mosaicMediaEl} ${captionEl}
      </div>
    `;

    mediaEl.addEventListener('touchend', swipeIntent, false);

    if (mediaEl.hasAttribute('href')) {
      mediaEl.addEventListener(
        'focus',
        () => {
          goToItem(index);
        },
        false
      );
    }

    if (captionEl) {
      const captionLinkEl = $('a', captionEl);

      if (captionLinkEl) {
        if (isMosaic) {
          captionLinkEl.setAttribute('tabindex', '-1');
        } else {
          captionLinkEl.addEventListener(
            'focus',
            () => {
              goToItem(index);
            },
            false
          );
        }
      }
    }

    return itemEl;
  });

  mediaEls = itemEls.map(itemEl => $('.Picture,.Quote,.VideoPlayer', itemEl));

  const itemsEl = html`
    <div
      class="Gallery-items"
      onmousedown=${pointerHandler(swipeBegin)}
      onmousemove=${pointerHandler(swipeUpdate)}
      onmouseup=${swipeComplete}
      onmouseleave=${swipeComplete}
    >
      ${itemEls}
    </div>
  `;

  itemsEl.addEventListener('touchstart', pointerHandler(swipeBegin), SUPPORTS_PASSIVE ? PASSIVE_OPTIONS : false);
  itemsEl.addEventListener('touchmove', pointerHandler(swipeUpdate), false);
  itemsEl.addEventListener('touchend', swipeComplete, false);
  itemsEl.addEventListener('touchcancel', swipeComplete, false);

  const paneEl = html`
    <div class="Gallery-pane">${itemsEl}</div>
  `;

  const indexEl = html`
    <div class="Gallery-index"></div>
  `;

  const prevEl = html`
    <button
      class="Gallery-step-prev"
      aria-label="View the previous item"
      onfocus=${() => goToItem(currentIndex)}
      onclick=${() => goToItem(currentIndex - 1)}
    >
      ${rawHTML(CONTROL_ICON_MARKUP)}
    </button>
  `;

  const nextEl = html`
    <button
      class="Gallery-step-next"
      aria-label="View the next item"
      onfocus=${() => goToItem(currentIndex)}
      onclick=${() => goToItem(currentIndex + 1)}
    >
      ${rawHTML(CONTROL_ICON_MARKUP)}
    </button>
  `;

  const controlsEl = html`
    <div class="Gallery-controls">
      ${indexEl}
      <div class="Gallery-steps">${prevEl}${nextEl}</div>
    </div>
  `;

  const galleryEl = html`
    <div class="${className}"><div class="Gallery-layout">${controlsEl} ${paneEl} ${masterCaptionEl}</div></div>
  `;

  galleryEl.api = { goToItem, measureDimensions };

  requestAnimationFrame(() => {
    goToItem((currentIndex = 0));
  });

  return galleryEl;
}

function RichtextTile(el, ratios) {
  return html`
    <div class="Gallery-richtextTile">
      ${Sizer(ratios)}
      <div class="Gallery-richtextTileContent u-richtext${getMeta().isDarkMode ? '-invert' : ''}">
        ${el}
      </div>
    </div>
  `;
}

function offsetBasedOpacity(itemIndex, itemsTransformXPct) {
  return (
    ((100 - Math.min(100, Math.abs(itemIndex * 100 + itemsTransformXPct))) / 100) * (1 - INACTIVE_OPACITY) +
    INACTIVE_OPACITY
  );
}

function transformSection(section) {
  const [, mosaicRowLengthsString] = `${section.name}${section.configSC}`.match(MOSAIC_ROW_LENGTHS_PATTERN) || [
    null,
    ''
  ];
  const isUnconstrained = mosaicRowLengthsString.length && section.configSC.includes('full');
  const ratios = getRatios(section.configSC);
  const unlink = section.configSC.includes('unlink');

  const nodes = [].concat(section.betweenNodes);

  const config = nodes.reduce(
    (config, node) => {
      detach(node);

      if (!isElement(node)) {
        return config;
      }

      const classList = node.className.split(' ');
      const isQuote = node.matches(SELECTORS.QUOTE);
      const imgEl = getChildImage(node);
      const linkEl = $('a[href]', node);
      const videoId =
        node.name && !!node.name.match(VIDEO_MARKER_PATTERN)
          ? node.name.match(VIDEO_MARKER_PATTERN)[1]
          : linkEl &&
            ((classList.indexOf('inline-content') > -1 && classList.indexOf('video') > -1) ||
              (classList.indexOf('view-inlineMediaPlayer') > -1 && classList.indexOf('doctype-abcvideo') > -1) ||
              (classList.indexOf('embed-content') > -1 && $('.type-video', node))) &&
            url2cmid(linkEl.getAttribute('href'));

      if (videoId) {
        const videoPlayerEl = VideoPlayer({
          videoId,
          ratios: {
            sm: ratios.sm || '3x4',
            md: ratios.md || '16x9',
            lg: ratios.lg || '16x9',
            xl: ratios.xl || '16x9'
          },
          isInvariablyAmbient: true
        });
        const mosaicVideoPlayerEls = [
          VideoPlayer({
            videoId,
            ratios: {
              sm: ratios.sm || '3x2',
              md: ratios.md || '16x9',
              lg: ratios.lg || '16x9',
              xl: ratios.xl || '16x9'
            },
            isInvariablyAmbient: true
          }),
          VideoPlayer({
            videoId,
            ratios: {
              sm: ratios.sm || '1x1',
              md: ratios.md || '3x2',
              lg: ratios.lg || '3x2',
              xl: ratios.xl || '3x2'
            },
            isInvariablyAmbient: true
          }),
          VideoPlayer({
            videoId,
            ratios: {
              sm: ratios.sm || '3x4',
              md: ratios.md || '4x3',
              lg: ratios.lg || '4x3',
              xl: ratios.xl || '4x3'
            },
            isInvariablyAmbient: true
          })
        ];
        const videoCaptionEl = Caption.createFromEl(node, unlink);

        // Videos that don't have captions right now can append them them later using metadata
        if (!videoCaptionEl) {
          videoPlayerEl.api.metadataHook = ({ alternativeText }) => {
            if (alternativeText) {
              append(videoPlayerEl.parentElement, Caption({ text: alternativeText, attribution: 'ABC News' }));
            }
          };
        }

        config.items.push({
          id: videoId,
          mediaEl: videoPlayerEl,
          mosaicMediaEls: mosaicVideoPlayerEls,
          captionEl: videoCaptionEl
        });
      } else if (imgEl) {
        const src = imgEl.src;
        const alt = imgEl.getAttribute('alt');
        const id = url2cmid(src);
        const linkUrl = `/news/${id}`;

        config.items.push({
          id,
          mediaEl: Picture({
            src,
            alt,
            ratios: {
              sm: ratios.sm || '3x4',
              md: ratios.md || '16x9',
              lg: ratios.lg || '16x9',
              xl: ratios.xl || '16x9'
            },
            linkUrl
          }),
          mosaicMediaEls: [
            Picture({
              src,
              alt,
              ratios: {
                sm: ratios.sm || '3x2',
                md: ratios.md || '16x9',
                lg: ratios.lg || '16x9',
                xl: ratios.xl || '16x9'
              },
              linkUrl
            }),
            Picture({
              src,
              alt,
              ratios: {
                sm: ratios.sm || '1x1',
                md: ratios.md || '3x2',
                lg: ratios.lg || '3x2',
                xl: ratios.xl || '3x2'
              },
              linkUrl
            }),
            Picture({
              src,
              alt,
              ratios: {
                sm: ratios.sm || '3x4',
                md: ratios.md || '4x3',
                lg: ratios.lg || '4x3',
                xl: ratios.xl || '4x3'
              },
              linkUrl
            })
          ],
          captionEl: Caption.createFromEl(node, unlink)
        });
      } else if (isQuote) {
        config.items.push({
          mediaEl: RichtextTile(
            Quote.createFromEl(node, {
              isPullquote: true
            }),
            {
              sm: ratios.sm || '3x4',
              md: ratios.md || '16x9',
              lg: ratios.lg || '16x9',
              xl: ratios.xl || '16x9'
            }
          ),
          mosaicMediaEls: [
            RichtextTile(
              Quote.createFromEl(node, {
                isPullquote: true
              }),
              {
                sm: ratios.sm || '3x2',
                md: ratios.md || '16x9',
                lg: ratios.lg || '16x9',
                xl: ratios.xl || '16x9'
              }
            ),
            RichtextTile(
              Quote.createFromEl(node, {
                isPullquote: true
              }),
              {
                sm: ratios.sm || '1x1',
                md: ratios.md || '3x2',
                lg: ratios.lg || '3x2',
                xl: ratios.xl || '3x2'
              }
            ),
            RichtextTile(
              Quote.createFromEl(node, {
                isPullquote: true
              }),
              {
                sm: ratios.sm || '3x4',
                md: ratios.md || '4x3',
                lg: ratios.lg || '4x3',
                xl: ratios.xl || '4x3'
              }
            )
          ]
        });
      } else if (node.tagName === 'P') {
        if (!config.masterCaptionText) {
          config.masterCaptionText = node.textContent;
          config.masterCaptionEl = Caption({
            text: config.masterCaptionText
          });
        } else if (!config.masterCaptionAttribution) {
          config.masterCaptionAttribution = node.textContent;
          config.masterCaptionEl = Caption({
            text: config.masterCaptionText,
            attribution: config.masterCaptionAttribution
          });
        }
      }

      return config;
    },
    {
      items: [],
      masterCaptionEl: null,
      masterCaptionText: null,
      masterCaptionAttribution: null,
      mosaicRowLengths: mosaicRowLengthsString.split(''),
      isUnconstrained
    }
  );

  delete config.masterCaptionText;
  delete config.masterCaptionAttribution;

  section.substituteWith(Gallery(config), []);
}

module.exports = Gallery;
module.exports.transformSection = transformSection;
module.exports.MOSAIC_ROW_LENGTHS_PATTERN = MOSAIC_ROW_LENGTHS_PATTERN;
