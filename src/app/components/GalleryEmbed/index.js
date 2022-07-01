import cn from 'classnames';
import html from 'bel';
import { url2cmid } from '@abcnews/url2cmid';
import { terminusFetch } from '../../utils/content';
import { $, $$, substitute } from '../../utils/dom';
import { getRatios } from '../../utils/misc';
import { grabPrecedingConfigString } from '../../utils/mounts';
import {
  createFromElement as createCaptionFromElement,
  createFromTerminusDoc as createCaptionFromTerminusDoc
} from '../Caption';
import Gallery, { MOSAIC_ROW_LENGTHS_PATTERN } from '../Gallery';
import { refresh as refreshMasterGallery, register as registerWithMasterGallery } from '../MasterGallery';
import Picture from '../Picture';

const GalleryEmbed = ({ galleryEl, captionEl, isAnon }) => {
  return html`<div class="GalleryEmbed">${galleryEl} ${isAnon ? null : captionEl}</div>`;
};

export default GalleryEmbed;

export const transformElement = el => {
  const linkEls = $$('a', el);
  const galleryId = url2cmid(linkEls[linkEls.length - 1].getAttribute('href'));

  if (!galleryId) {
    return;
  }

  const configString = grabPrecedingConfigString(el);
  const [, mosaicRowLengthsString] = `${configString}`.match(MOSAIC_ROW_LENGTHS_PATTERN) || [null, ''];
  const ratios = getRatios(configString);
  const unlink = configString.includes('unlink');

  const placeholderEl = document.createElement('div');

  substitute(el, placeholderEl);

  const config = {
    items: [],
    mosaicRowLengths: mosaicRowLengthsString.split('')
  };

  terminusFetch({ id: galleryId, type: 'gallery' }).then(galleryDoc => {
    // Mosaics should have a master caption
    if (config.mosaicRowLengths.length > 0) {
      config.masterCaptionEl = createCaptionFromElement(
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

        registerWithMasterGallery(imageDoc);

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
          captionEl: createCaptionFromTerminusDoc(imageDoc, unlink)
        };
      });

      const galleryEl = Gallery(config);

      substitute(placeholderEl, galleryEl);
      setTimeout(galleryEl.api.measureDimensions, 0);
      refreshMasterGallery();
    });
  });
};
