// External
const cn = require('classnames');
const html = require('bel');
const url2cmid = require('util-url2cmid');

// Ours
const { grabConfigSC } = require('../../utils/anchors');
const { terminusFetch } = require('../../utils/content');
const { $, $$, substitute } = require('../../utils/dom');
const { getRatios } = require('../../utils/misc');
const Caption = require('../Caption');
const Gallery = require('../Gallery');
const MasterGallery = require('../MasterGallery');
const Picture = require('../Picture');

function GalleryEmbed({ galleryEl, captionEl, isAnon }) {
  return html`
    <div class="GalleryEmbed">${galleryEl} ${isAnon ? null : captionEl}</div>
  `;
}

function transformEl(el) {
  const linkEls = $$('a', el);
  const galleryId = url2cmid(linkEls[linkEls.length - 1].getAttribute('href'));

  if (!galleryId) {
    return;
  }

  const configSC = grabConfigSC(el);
  const [, mosaicRowLengthsString] = `${configSC}`.match(Gallery.MOSAIC_ROW_LENGTHS_PATTERN) || [null, ''];
  const ratios = getRatios(configSC);
  const unlink = configSC.includes('unlink');

  const placeholderEl = document.createElement('div');

  substitute(el, placeholderEl);

  const config = {
    items: [],
    mosaicRowLengths: mosaicRowLengthsString.split('')
  };

  terminusFetch({ id: galleryId, type: 'gallery' }).then(galleryDoc => {
    // Mosaics should have a master caption
    if (config.mosaicRowLengths.length > 0) {
      config.masterCaptionEl = Caption.createFromEl(
        html`
          <div
            data-caption-config="${JSON.stringify({
              url: `/news/${galleryDoc.id}`,
              text: galleryDoc.synopsis,
              attribution: galleryDoc.rightsHolder.join(', '),
              unlink
            })}"
          ></div>
        `,
        unlink
      );
    }

    Promise.all(
      galleryDoc._embedded.content.map(item => terminusFetch({ id: item.id, type: item.docType.toLowerCase() }))
    ).then(imageDocs => {
      config.items = imageDocs.map(imageDoc => {
        const src = imageDoc.media.image.primary.complete[0].url;
        const alt = imageDoc.alt;
        const id = url2cmid(src); // imageDoc.id will be wrong for ImageProxy documents
        const linkUrl = `/news/${id}`;

        MasterGallery.register(
          html`
            <div
              data-caption-config="${JSON.stringify({
                url: linkUrl,
                text: imageDoc.caption,
                attribution: imageDoc.attribution,
                unlink
              })}"
            >
              <img src="${src}" alt="${alt}" />
            </div>
          `
        );

        return {
          id,
          mediaEl: Picture({
            src,
            alt,
            ratios: {
              sm: ratios.sm || '3x4',
              md: ratios.md,
              lg: ratios.lg,
              xl: ratios.xl
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
                lg: ratios.lg,
                xl: ratios.xl
              },
              linkUrl
            }),
            Picture({
              src,
              alt,
              ratios: {
                sm: ratios.sm || '1x1',
                md: ratios.md,
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
          captionEl: Caption({
            url: linkUrl,
            text: imageDoc.caption,
            attribution: imageDoc.attribution,
            unlink
          })
        };
      });

      const galleryEl = Gallery(config);

      substitute(placeholderEl, galleryEl);
      setTimeout(galleryEl.api.measureDimensions, 0, { hasChanged: true });
      MasterGallery.refresh();
    });
  });
}

module.exports = GalleryEmbed;
module.exports.transformEl = transformEl;
