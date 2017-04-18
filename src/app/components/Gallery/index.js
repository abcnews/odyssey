// External
const cn = require('classnames');
const html = require('bel');

// Ours
const {detach, isElement, returnFalse, select, selectAll, trim} = require('../../../utils');
const {nextFrame, subscribe} = require('../../loop');
const Caption = require('../Caption');
const Picture = require('../Picture');

const TILED_ROW_LENGTHS_PATTERN = /tiled(\d+)/;
const TRANSLATE_X_PCT_PATTERN = /(-?[0-9\.]+)/;
const SWIPE_THRESHOLD = 25;
const AXIS_THRESHOLD = 5;

function Gallery({
  images = [],
  tiledRowLengths = []
}) {
  let startTransitionX;
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
  let previousControlsWidth;
  let controlsWidth;

  function updateImagesTransform(transform) {
    nextFrame(() => {
      imagesEl.style.transform = transform;
    });
  }

  function goToImage(index) {
    if (index < 0 || index >= images.length) {
      index = currentIndex;
    }

    imageEls[currentIndex].classList.remove('is-active');
    linkEls[currentIndex].classList.remove('is-active');

    currentIndex = index;

    galleryEl.classList[index === 0 ? 'add' : 'remove']('is-at-start');
    galleryEl.classList[index === images.length - 1 ? 'add' : 'remove']('is-at-end');
    imageEls[currentIndex].classList.add('is-active');
    linkEls[currentIndex].classList.add('is-active');
    indexEl.textContent = `${currentIndex + 1} of ${images.length}`;

    updateImagesTransform(`translateX(-${currentIndex * 100}%)`);
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
    if (startTransitionX != null) {
      return;
    }

    const [, transformXPct] = imagesEl.style.transform.match(TRANSLATE_X_PCT_PATTERN) || [, 0];

    startTransitionX = parseInt(transformXPct, 10);
    startX = event.clientX;
    startY = event.clientY;
    diffX = 0;
    diffY = 0;
    swipeAxis = null;

    imagesEl.style.transition = 'transform 0s';
  }

  function swipeUpdate(event) {
    if (startTransitionX == null || swipeAxis === 'vertical') {
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
      updateImagesTransform(`translateX(${startTransitionX / 100 * paneWidth + diffX}px)`);
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
    if (startTransitionX == null) {
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
      shouldIgnoreClicks = true;
      setTimeout(function () {
        shouldIgnoreClicks = false;
      }, 50);

      if (absDiffX > SWIPE_THRESHOLD) {
        // Update the image index we'll be navigating to
        nextIndex = currentIndex - diffX / absDiffX;
      }
    }

    startTransitionX = null;
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
    if (lastViewport.width === viewport.width && lastViewport.height === viewport.height) {
      return;
    }

    lastViewport = viewport;
    paneWidth = paneEl.getBoundingClientRect().width;
    imageHeight = select('img', imageEls[currentIndex]).getBoundingClientRect().height;
    controlsWidth = controlsEl.getBoundingClientRect().width;
  }

  function mutate() {
    if (imageHeight !== previousImageHeight) {
      controlsEl.style.top = `${imageHeight}px`;
      previousImageHeight = imageHeight;
    }

    if (controlsWidth !== previousControlsWidth) {
      selectAll('.Caption', imagesEl).forEach(el => {
        el.style.marginRight = `${controlsWidth}px`;
      })
      previousControlsWidth = controlsWidth;
    }
  }

  const className = cn('Gallery', {
    'is-short': images.length < 4,
    'is-tiling-specified': tiledRowLengths.length > 0
  }, 'u-full');

  const tileWidths = tiledRowLengths.reduce((widths, rowLength) => {
    for (let i = 0, len = rowLength; i < rowLength; i++) {
      widths.push(100 / rowLength);
    }

    return widths;
  }, []);

  const imageEls = images.map(({pictureEl, captionEl}, index) => {
    select('img', pictureEl).onload = measure;

    const imageEl = html`
      <div class="Gallery-image"
        style="-ms-flex: 0 0 ${tileWidths[index] || 100}%; flex: 0 0 ${tileWidths[index] || 100}%"
        data-index="${index}"
        ondragstart=${returnFalse}
        onmouseup=${swipeIntent}
        onclick=${stopIfIgnoringClicks}>
        ${select('img', pictureEl).setAttribute('draggable', 'false'), pictureEl}
        ${captionEl}
      </div>
    `;

    imageEl.addEventListener('touchend', swipeIntent, false);

    return imageEl;
  });

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

  const linkEls = images.map((image, index) => html`
    <button class="Gallery-link"
      title="View image ${index + 1} of ${images.length}"
      onmouseup=${swipeIntent}
      onclick=${goToImage.bind(null, index)}></button>
  `);

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

  const indexEl = html`
    <div class="Gallery-index"></div>
  `;

  const controlsEl = html`
    <div class="Gallery-controls">
      ${linkEls.concat(prevEl, nextEl, indexEl)}
    </div>
  `;

  const galleryEl = html`
    <div class="${className}">
      <div class="Gallery-layout">
        ${paneEl}
        ${controlsEl}
      </div>
    </div>
  `;

  subscribe({
    measure,
    mutate,
  });

  goToImage(currentIndex = 0);

  return galleryEl;
};

function transformSection(section) {
  const [, tiledRowLengthsString] = section.suffix.match(TILED_ROW_LENGTHS_PATTERN) || [null, ''];
  const [, smRatio] = section.suffix.match(Picture.SM_RATIO_PATTERN) || [];
  const [, mdRatio] = section.suffix.match(Picture.MD_RATIO_PATTERN) || [];
  const [, lgRatio] = section.suffix.match(Picture.LG_RATIO_PATTERN) || [];

  const nodes = [].concat(section.betweenNodes);

  const config = nodes.reduce((config, node) => {
    const imgEl = isElement(node) && select('img', node);

    if (imgEl) {
      config.images.push({
        pictureEl: Picture({
          src: imgEl.src,
          alt: imgEl.getAttribute('alt'),
          smRatio: smRatio || '3x4',
          mdRatio,
          lgRatio
        }),
        captionEl: Caption.createFromEl(node)
      });
    }

    detach(node);

    return config;
  }, {
    images: [],
    tiledRowLengths: tiledRowLengthsString.split('')
  });

  section.betweenNodes = [];

  section.replaceWith(Gallery(config));
}

module.exports = Gallery;
module.exports.transformSection = transformSection;
