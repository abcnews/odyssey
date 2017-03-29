// External
const html = require('bel');
const raf = require('raf');

// Ours
const {SELECTORS} = require('../constants');
const {after, append, before, detachAll, getPlaceholders, getSections, isElement, select, selectAll} = require('../utils');
const Cover = require('./components/Cover');
const Gallery = require('./components/Gallery');
const Header = require('./components/Header');
const ImageEmbed = require('./components/ImageEmbed');
const Nav = require('./components/Nav');
const Quote = require('./components/Quote');
const Share = require('./components/Share');
const UPull = require('./components/UPull');
const VideoEmbed = require('./components/VideoEmbed');
const {getData, subscribe} = require('./hooks');
const {getMeta} = require('./meta');
const reset = require('./reset');

function app(done) {
  const meta = getMeta(); // Must happen before the story reset
  const storyEl = reset(select(SELECTORS.STORY));

  after(select(SELECTORS.GLOBAL_NAV), Nav({shareLinks: meta.shareLinks}));

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
    mediaEl: select('img, video', el),
    nextEl: el.nextElementSibling,
    state: {opacity: 1, translateY: 0},
    nextState: {}
  }))
  .filter(parallax => parallax.mediaEl);

  if (parallaxes.length > 0) {

    function updateNextStates() {
      parallaxes.forEach(parallax => {
        const rect = parallax.el.getBoundingClientRect();

        if (rect.bottom < 0 || rect.top > rect.height) {
          return;
        }

        const top = Math.min(0, rect.top);
        const opacityExtent = parallax.nextEl ?
          parallax.nextEl.getBoundingClientRect().top - top :
          rect.height;

        parallax.nextState = {
          opacity: 1 + top / opacityExtent,
          translateY: -33.33 * (top / rect.height),
        };
      });
    }

    function updateMediaEls() {
      parallaxes.forEach(parallax => {
        if (parallax.nextState.translateY !== parallax.state.translateY) {
          parallax.state = parallax.nextState;
          parallax.mediaEl.style.opacity = parallax.state.opacity;
          parallax.mediaEl.style.transform = `translateY(${parallax.state.translateY}%)`;
        }
      });
    }

    subscribe({
      onSize: updateNextStates,
      onPan: updateNextStates,
      onFrame: updateMediaEls
    });

    raf(() => {
      updateNextStates();
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

  if (typeof done === 'function') {
    done();
  }
};

module.exports = app;
