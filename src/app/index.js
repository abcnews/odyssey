// External
const html = require('bel');

// Ours
const {SELECTORS} = require('../constants');
const {after, append, before, detach, detachAll,
  getPlaceholders, getSections, isElement, prepend,
  select, selectAll} = require('../utils');
const Caption = require('./components/Caption');
const Cover = require('./components/Cover');
const Gallery = require('./components/Gallery');
const Header = require('./components/Header');
const ImageEmbed = require('./components/ImageEmbed');
const MasterGallery = require('./components/MasterGallery');
const Nav = require('./components/Nav');
const Quote = require('./components/Quote');
const Share = require('./components/Share');
const UPull = require('./components/UPull');
const VideoEmbed = require('./components/VideoEmbed');
const {enqueue, start, subscribe} = require('./scheduler');
const {getMeta} = require('./meta');
const reset = require('./reset');

const BEGINS_WITH_ALPHANUMERIC_PATTERN = /^\w/;

function app(done) {
  const meta = getMeta();
  const storyEl = reset(select(SELECTORS.STORY), meta);

  after(select(SELECTORS.GLOBAL_NAV), Nav({shareLinks: meta.shareLinks}));

  start(); // loop

  // Register all embedded images with MasterGallery 
  selectAll(`
    .inline-content.photo,
    [class*="view-image-embed"]
  `, storyEl)
  .concat(selectAll('.embed-content', storyEl)
    .filter(el => select('.type-photo', el)))
  .forEach(MasterGallery.register);

  // Replace placeholders
  getPlaceholders([
    'hr',
    'share'
  ]).forEach(placeholder => {
    switch (placeholder.name) {
      case 'hr':
        placeholder.replaceWith(html`<hr>`);
        break;
      case 'share':
        Share.transformPlaceholder(placeholder, meta.shareLinks);
        break;
      default:
        break;
    }
  });

  let hasHeader = false;

  // Replace sections
  getSections([
    'header',
    'cover',
    'gallery',
    'mosaic',
    'pull'
  ]).forEach(section => {
    switch (section.name) {
      case 'header':
        hasHeader = true;
        Header.transformSection(section, meta);
        break;
      case 'cover':
        Cover.transformSection(section);
        break;
      case 'gallery':
      case 'mosaic':
        Gallery.transformSection(section);
        break;
      case 'pull':
        UPull.transformSection(section);
        break;
      default:
        break;
    }
  });

  if (!hasHeader) {
    prepend(storyEl, Header({meta}));
  }

  // Enable parallax
  const parallaxes = selectAll('.u-parallax')
  .map(el => ({
    el,
    nextEl: el.nextElementSibling,
    state: {}
  }));

  if (parallaxes.length > 0) {
    subscribe(function _checkIfParallaxesPropertiesNeedToBeUpdated() {
      parallaxes.forEach(parallax => {
        const rect = parallax.el.getBoundingClientRect();

        if (rect.bottom < 0 || rect.top > rect.height) {
          return;
        }

        const top = Math.min(0, rect.top);
        const opacityExtent = parallax.nextEl ?
          parallax.nextEl.getBoundingClientRect().top - top :
          rect.height;
        const opacity = 1 + top / opacityExtent;
        const yOffset = -33.33 * (top / rect.height);

        if (opacity !== parallax.state.opacity) {
          enqueue(function _updateParallaxProperties() {
            parallax.el.style.opacity = opacity;
            parallax.el.style.transform = `translate3d(0, ${yOffset}%, 0)`;
          });
          parallax.state = {opacity, yOffset};
        }
      });
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

  // Enable drop-caps after headers and horizontal rules
  selectAll('.Header, hr')
  .forEach(el => {
    let nextEl = el.nextElementSibling;

    if (
      nextEl !== null &&
      nextEl.tagName !== 'P'
    ) {
      nextEl = nextEl.nextElementSibling;
    }

    if (
      nextEl !== null &&
      nextEl.tagName === 'P' &&
      nextEl.textContent.length > 80 &&
      BEGINS_WITH_ALPHANUMERIC_PATTERN.test(nextEl.textContent)
    ) {
      nextEl.classList.add('u-dropcap');
    }
  });

  // Embed master gallery
  append(storyEl, MasterGallery());

  if (typeof done === 'function') {
    done();
  }
};

module.exports = app;
