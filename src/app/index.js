// External
const html = require('bel');

// Ours
const {SELECTORS} = require('../constants');
const {after, append, before, detach, detachAll, getPlaceholders,
  getSections, isElement, select, selectAll} = require('../utils');
const Caption = require('./components/Caption');
const Cover = require('./components/Cover');
const Gallery = require('./components/Gallery');
const Header = require('./components/Header');
const ImageEmbed = require('./components/ImageEmbed');
const Nav = require('./components/Nav');
const Quote = require('./components/Quote');
const Share = require('./components/Share');
const UPull = require('./components/UPull');
const VideoEmbed = require('./components/VideoEmbed');
const {start, subscribe} = require('./loop');
const {getMeta} = require('./meta');
const reset = require('./reset');

function app(done) {
  const meta = getMeta();
  const storyEl = reset(select(SELECTORS.STORY), meta);

  after(select(SELECTORS.GLOBAL_NAV), Nav({shareLinks: meta.shareLinks}));

  start(); // loop

  getPlaceholders([
    'share',
  ]).forEach(placeholder => {
    switch (placeholder.name) {
      case 'share':
        Share.transformPlaceholder(placeholder, meta.shareLinks);
        break;
      default:
        break;
    }
  });

  getSections([
    'header',
    'cover',
    'gallery',
    'pull'
  ]).forEach(section => {
    switch (section.name) {
      case 'header':
        Header.transformSection(section, meta);
        break;
      case 'cover':
        Cover.transformSection(section);
        break;
      case 'gallery':
        Gallery.transformSection(section);
        break;
      case 'pull':
        UPull.transformSection(section);
        break;
      default:
        break;
    }
  });

  // Enable parallax
  const parallaxes = selectAll('.u-parallax')
  .map(el => ({
    el,
    nextEl: el.nextElementSibling,
    previousState: {},
    state: {}
  }));

  if (parallaxes.length > 0) {

    function measure() {
      parallaxes.forEach(parallax => {
        const rect = parallax.el.getBoundingClientRect();

        if (rect.bottom < 0 || rect.top > rect.height) {
          return;
        }

        const top = Math.min(0, rect.top);
        const opacityExtent = parallax.nextEl ?
          parallax.nextEl.getBoundingClientRect().top - top :
          rect.height;

        parallax.state = {
          opacity: 1 + top / opacityExtent,
          translateY: -33.33 * (top / rect.height),
        };
      });
    }

    function mutate() {
      parallaxes.forEach(parallax => {
        if (parallax.state.translateY !== parallax.previousState.translateY) {
          parallax.el.style.opacity = parallax.state.opacity;
          parallax.el.style.transform = `translateY(${parallax.state.translateY}%)`;
          parallax.previousState = parallax.state;
        }
      });
    }

    subscribe({
      measure,
      mutate
    });
  }

  // Transform image embeds
  const sidePulls = selectAll('.u-pull-left, .u-pull-right');

  selectAll(`
    .inline-content.photo,
    [class*="view-image-embed"]
  `, storyEl)
  .concat(selectAll('.embed-content', storyEl)
    .filter(el => select('.type-photo', el)))
  .forEach(el => {
    const isSidePulled = sidePulls.filter(pEl => pEl.contains(el)).length > 0;

    ImageEmbed.transformEl(el, isSidePulled);
  });

  // Transform video embeds
  selectAll(`
    .inline-content.video,
    .view-inlineMediaPlayer
  `, storyEl)
  .concat(selectAll('.embed-content', storyEl)
    .filter(el => select('.type-video', el)))
  .forEach(VideoEmbed.transformEl);

  // Transform quotes (native and embedded)
  selectAll(`
    blockquote:not([class]),
    .quote--pullquote,
    .inline-content.quote,
    .embed-quote,
    .comp-rich-text-blockquote,
    .view-inline-pullquote
  `, storyEl)
  .forEach(Quote.transformEl);

  // Nullify nested pulls (outer always wins)
  selectAll('[class*="u-pull"] [class*="u-pull"]')
  .forEach(el => el.className = el.className.replace(/u-pull(-\w+)?/, 'n-pull$1'));

  // Transform embedded external link captions
  let eels = selectAll('.inline-content[class*="embed"]', storyEl)
    .concat(selectAll('.embed-content', storyEl)
      .filter(el => select('.type-external', el)));

  setTimeout(function transformRemainingEELs() {
    eels = eels.reduce((memo, el) => {
      if (el.className.indexOf(' embedded') > -1 || select('.embedded', el)) {
        const captionEl = Caption.createFromEl(el);

        const oldCaptionEl = select(`
          .embed-caption,
          .inline-caption
        `);

        before(oldCaptionEl, captionEl);
        detach(oldCaptionEl);
      } else {
        memo.push(el);
      }

      return memo;
    }, []);

    if (eels.length > 0) {
      setTimeout(transformRemainingEELs, 500);
    }
  }, 0);

  // Enable drop-caps
  selectAll('.Header')
  .forEach(el => {
    let nextEl = el.nextElementSibling;

    if (nextEl.tagName !== 'P') {
      nextEl = nextEl.nextElementSibling;
    }

    if (
      nextEl.tagName === 'P' &&
      nextEl.textContent.length > 80 &&
      nextEl.textContent[0] !== '"'
    ) {
      nextEl.classList.add('u-dropcap');
    }
  });

  if (typeof done === 'function') {
    done();
  }
};

module.exports = app;
