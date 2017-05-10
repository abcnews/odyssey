// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const {detach, isElement, returnFalse, select, selectAll, trim} = require('../../../utils');
const {nextFrame, subscribe} = require('../../loop');
const Caption = require('../Caption');
const Picture = require('../Picture');

const MOSAIC_ROW_LENGTHS_PATTERN = /(?:tiled|mosaic)(\d+)/;
const PCT_PATTERN = /(-?[0-9\.]+)%/;
const SWIPE_THRESHOLD = 25;
const AXIS_THRESHOLD = 5;
const INACTIVE_OPACITY = .2;

function Gallery({
  images = [],
  masterCaptionEl,
  mosaicRowLengths = []
}) {
  let startImagesTransformXPct;
  let startX;
  let startY;
  let diffX;
  let diffY;
  let swipeAxis;
  let shouldIgnoreClicks;
  let currentIndex;
  let lastViewport = {};
  let paneWidth;
  let previousImageHeight;
  let imageHeight;


  function updateImagesTransform(xPct, isImmediate) {
    if (isImmediate) {
      const onEnd = () => {
        imagesEl.removeEventListener('transitionend', onEnd);
        imagesEl.style.transitionDuration = '';
        pictureEls.forEach(pictureEl => pictureEl.style.transitionDuration = '');
      };

      imagesEl.style.transitionDuration = '0s';
      pictureEls.forEach(pictureEl => pictureEl.style.transitionDuration = '0s');
      imagesEl.addEventListener('transitionend', onEnd, false);
    }

    nextFrame(() => {
      imagesEl.style.transform = `translate3d(${xPct}%, 0, 0)`;
      pictureEls.forEach((pictureEl, index) => {
        pictureEl.style.opacity = offsetBasedOpacity(index, xPct);
      });
    });
  }

  function goToImage(index, isImmediate) {
    if (index < 0 || index >= images.length) {
      index = currentIndex;
    }

    imageEls[currentIndex].classList.remove('is-active');

    currentIndex = index;

    galleryEl.classList[index === 0 ? 'add' : 'remove']('is-at-start');
    galleryEl.classList[index === images.length - 1 ? 'add' : 'remove']('is-at-end');
    imageEls[currentIndex].classList.add('is-active');
    indexEl.textContent = `${currentIndex + 1} / ${images.length}`;

    updateImagesTransform(-currentIndex * 100, isImmediate);
  }

  function pointerHandler(fn) {
    return function handler (event) {
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
    if (startImagesTransformXPct != null) {
      return;
    }

    const [, xPct] = imagesEl.style.transform.match(PCT_PATTERN) || [, 0];

    startImagesTransformXPct = parseInt(xPct, 10);
    startX = event.clientX;
    startY = event.clientY;
    diffX = 0;
    diffY = 0;
    swipeAxis = null;

    imagesEl.style.transition = 'transform 0s';
  }

  function swipeUpdate(event) {
    if (startImagesTransformXPct == null || swipeAxis === 'vertical') {
      return;
    }

    diffX = (event.clientX - startX);
    diffY = (event.clientY - startY);

    if (!swipeAxis) {
      let absDiffX = Math.abs(diffX);
      let absDiffY = Math.abs(diffY);

      if (absDiffX > AXIS_THRESHOLD || absDiffY > AXIS_THRESHOLD) {
        swipeAxis = (absDiffX < absDiffY) ? 'vertical' : 'horizontal';
      }
    }

    if (swipeAxis === 'horizontal') {
      event.preventDefault();
      event.stopPropagation();

      imagesEl.classList.add('is-moving');
      updateImagesTransform(startImagesTransformXPct + diffX / paneWidth * 100);
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
    if (startImagesTransformXPct == null) {
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
        setTimeout(function () {
          shouldIgnoreClicks = false;
        }, 50);
      }

      if (absDiffX > SWIPE_THRESHOLD) {
        // Update the image index we'll be navigating to
        nextIndex = currentIndex - diffX / absDiffX;
      }
    }

    startImagesTransformXPct = null;
    startX = null;
    startY = null;
    diffX = null;
    diffY = null;
    swipeAxis = null;

    imagesEl.style.transition = '';

    imagesEl.classList.remove('is-moving');
    goToImage(nextIndex);
  }

  function measure(viewport) {
    if (
      lastViewport.width === viewport.width &&
      lastViewport.height === viewport.height
    ) {
      return;
    }

    lastViewport = viewport;
    paneWidth = paneEl.getBoundingClientRect().width;
    imageHeight = select('[class^=u-sizer]', imageEls[currentIndex]).getBoundingClientRect().height;
  }

  function mutate() {
    if (imageHeight !== previousImageHeight) {
      controlsEl.style.transform = `translate(0, ${imageHeight}px) translate(0, -100%)`;
      previousImageHeight = imageHeight;
    }
  }

  const className = cn('Gallery', {
    'is-mosaic': mosaicRowLengths.length > 0
  }, 'u-full');

  mosaicRowLengths = mosaicRowLengths.map(rowLength => Math.min(3, rowLength));

  const mosaicRowLengthsClone = [].concat(mosaicRowLengths);
  const mosaicRows = images.reduce((memo, image, index) => {
    if (mosaicRowLengthsClone.length === 0) {
      mosaicRowLengthsClone.push(1);
    }

    memo[memo.length - 1].push(image);

    mosaicRowLengthsClone[0]--;

    if (mosaicRowLengthsClone[0] === 0) {
      mosaicRowLengthsClone.shift();

      if (index + 1 < images.length) {
        memo.push([]);
      }
    }

    return memo;
  }, [[]]);

  mosaicRows.forEach(images => {
    images.forEach(image => {
      image.rowLength = images.length;
      image.flexBasisPct = 100 / image.rowLength;
      image.mosaicPictureEl = image.mosaicPictureEls ?
        image.mosaicPictureEls[image.rowLength  - 1] :
        image.pictureEl.cloneNode(true);
    });
  });

  const imageEls = images.map(({
    id,
    pictureEl,
    mosaicPictureEl,
    captionEl,
    flexBasisPct
  }, index) => {
    const imgEl = select('img', pictureEl);
    
    imgEl.onload = measure;
    imgEl.setAttribute('draggable', 'false');

    const imageEl = html`
      <div class="Gallery-image"
        style="-ms-flex: 0 0 ${flexBasisPct}%; flex: 0 0 ${flexBasisPct}%"
        data-id="${id}"
        data-index="${index}"
        ondragstart=${returnFalse}
        onmouseup=${swipeIntent}
        onclick=${stopIfIgnoringClicks}>
        ${pictureEl}
        ${mosaicPictureEl}
        ${masterCaptionEl ? null : captionEl}
      </div>
    `;

    imageEl.addEventListener('touchend', swipeIntent, false);

    const captionLinkEl = masterCaptionEl ? null : select('a', captionEl);

    if (captionLinkEl) {
      captionLinkEl.addEventListener('focus', () => {
        galleryEl.scrollLeft = 0;
        goToImage(index);
      }, false);
    }

    return imageEl;
  });

  const pictureEls = imageEls.map(imageEl => select('picture', imageEl));

  const imagesEl = html`
    <div class="Gallery-images"
      onmousedown=${pointerHandler(swipeBegin)}
      onmousemove=${pointerHandler(swipeUpdate)}
      onmouseup=${swipeComplete}
      onmouseleave=${swipeComplete}>
      ${imageEls}
    </div>
  `;

  imagesEl.addEventListener('touchstart', pointerHandler(swipeBegin), false);
  imagesEl.addEventListener('touchmove', pointerHandler(swipeUpdate), false);
  imagesEl.addEventListener('touchend', swipeComplete, false);
  imagesEl.addEventListener('touchcancel', swipeComplete, false);

  const paneEl = html`
    <div class="Gallery-pane">
      ${imagesEl}
    </div>
  `;

  const indexEl = html`
    <div class="Gallery-index"></div>
  `;

  const prevEl = html`
    <button class="Gallery-step-prev"
      title="View the previous image"
      onclick=${() => goToImage(currentIndex - 1)}></button>
  `;

  const nextEl = html`
    <button class="Gallery-step-next"
      title="View the next image"
      onclick=${() => goToImage(currentIndex + 1)}></button>
  `;

  const controlsEl = html`
    <div class="Gallery-controls">
      ${indexEl}
      <div class="Gallery-steps">
        ${prevEl}${nextEl}
      </div>
    </div>
  `;

  const galleryEl = html`
    <div class="${className}">
      <div class="Gallery-layout">
        ${controlsEl}
        ${paneEl}
        ${masterCaptionEl}
      </div>
    </div>
  `;

  galleryEl.api = {
    goToImage,
    measure,
    mutate
  };

  subscribe({
    measure,
    mutate,
  });

  goToImage(currentIndex = 0);

  return galleryEl;
};

function offsetBasedOpacity(imageIndex, imagesTransformXPct) {
  return (
    (100 - Math.min(100, Math.abs(imageIndex * 100 + imagesTransformXPct))
  ) / 100) * (1 - INACTIVE_OPACITY) + INACTIVE_OPACITY;
}

function transformSection(section) {
  const [, mosaicRowLengthsString] = (`${section.name}${section.suffix}`).match(MOSAIC_ROW_LENGTHS_PATTERN) || [null, ''];
  const [, smRatio] = section.suffix.match(Picture.SM_RATIO_PATTERN) || [];
  const [, mdRatio] = section.suffix.match(Picture.MD_RATIO_PATTERN) || [];
  const [, lgRatio] = section.suffix.match(Picture.LG_RATIO_PATTERN) || [];

  const nodes = [].concat(section.betweenNodes);

  const config = nodes.reduce((config, node) => {
    const imgEl = isElement(node) && select('img', node);

    if (imgEl) {
      const src = imgEl.src;
      const alt = imgEl.getAttribute('alt');
      const id = url2cmid(src);
      const linkUrl = `/news/${id}`;

      config.images.push({
        id,
        pictureEl: Picture({
          src,
          alt,
          smRatio: smRatio || '3x4',
          mdRatio,
          lgRatio,
          linkUrl
        }),
        mosaicPictureEls: [
          Picture({
            src,
            alt,
            smRatio: smRatio || '3x2',
            mdRatio: mdRatio || '16x9',
            lgRatio,
            linkUrl
          }),
          Picture({
            src,
            alt,
            smRatio: smRatio || '1x1',
            mdRatio,
            lgRatio: lgRatio || '3x2',
            linkUrl
          }),
          Picture({
            src,
            alt,
            smRatio: smRatio || '3x4',
            mdRatio: mdRatio || '4x3',
            lgRatio: lgRatio || '4x3',
            linkUrl
          })
        ],
        captionEl: Caption.createFromEl(node)
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

    detach(node);

    return config;
  }, {
    images: [],
    masterCaptionEl: null,
    masterCaptionText: null,
    masterCaptionAttribution: null,
    mosaicRowLengths: mosaicRowLengthsString.split('')
  });

  delete config.masterCaptionText;
  delete config.masterCaptionAttribution;

  section.betweenNodes = [];

  section.replaceWith(Gallery(config));
}

module.exports = Gallery;
module.exports.transformSection = transformSection;
