// @ts-check
import { getImages } from '@abcnews/terminus-fetch';
import { fetchDocument } from '../../utils/content';
import { srcsetFromRenditions } from '.';
import { prepend } from '../../utils/dom';
import { BP, MQ, UNIT } from '../../constants';
import html from 'nanohtml';

/**
 *
 * @param {object} options
 * @param {MediaEmbedded} options.primaryImage
 * @param {HTMLPictureElement} options.pictureEl
 * @param {HTMLElement} options.rootEl
 */
export const initArtDirection = async ({ primaryImage, pictureEl, rootEl }) => {
  const doc = await fetchDocument(primaryImage.id);
  const alts = await Promise.all(
    (doc.contextSettings['odyssey'].alts || []).map(async d => {
      return { width: d.width, image: await fetchDocument(d.image.id) };
    })
  );
  const srcsets = alts.map(({ width, image }) => {
    const renditions = getImages(image).renditions;
    return { width, srcset: srcsetFromRenditions(renditions) };
  });

  srcsets.forEach(({ width, srcset }) => {
    const mq = MQ[width.toUpperCase()];
    if (mq) {
      const source = html`<source
        media="${mq}"
        srcset="${srcset}"
        sizes="${MQ.GT_MD} ${Math.round(BP.LG * 0.666)}px, 100vw"
      />`;
      prepend(pictureEl, source);
    }
  });

  const reveal = () => rootEl.classList.remove('awaiting-alternatives');

  const img = pictureEl.getElementsByTagName('img')[0];
  if (img) {
    img.addEventListener('load', reveal);
  }

  setTimeout(reveal, 500);
};
