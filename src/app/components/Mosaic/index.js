import { getMountValue, isPrefixedMount } from '@abcnews/mount-utils';
import cn from 'classnames';
import html from 'nanohtml';
import { SELECTORS, VIDEO_MARKER_PATTERN } from '../../constants';
import { lookupImageByAssetURL } from '../../meta';
import { $, $$, append, detach, detectVideoId, getChildImage, isElement } from '../../utils/dom';
import { getRatios } from '../../utils/misc';
import Caption, {
  createFromElement as createCaptionFromElement,
  createFromTerminusDoc as createCaptionFromTerminusDoc
} from '../Caption';
import Picture from '../Picture';
import { createFromElement as createQuoteFromElement } from '../Quote';
import RichtextTile from '../RichtextTile';
import VideoPlayer from '../VideoPlayer';
import styles from './index.lazy.scss';

const ROW_LENGTHS_PATTERN = /mosaic[a-z]*(\d+)/;

const Mosaic = ({ items = [], masterCaptionEl, rowLengths = [], isFull = false }) => {
  if (items.length === 0) {
    return html`<div class="Mosaic is-empty"></div>`;
  }

  rowLengths = rowLengths.map(rowLength => Math.min(3, rowLength));

  const rowLengthsClone = [].concat(rowLengths);
  const rows = items.reduce(
    (memo, item, index) => {
      if (rowLengthsClone.length === 0) {
        rowLengthsClone.push(1);
      }

      memo[memo.length - 1].push(item);

      rowLengthsClone[0]--;

      if (rowLengthsClone[0] === 0) {
        rowLengthsClone.shift();

        if (index + 1 < items.length) {
          memo.push([]);
        }
      }

      return memo;
    },
    [[]]
  );

  rows.forEach(items => {
    items.forEach(item => {
      item.rowLength = items.length;
      item.flexBasisPct = 100 / item.rowLength;
      item.candidateMediaEls.forEach((el, index) => {
        if (index === item.rowLength - 1) {
          item.mediaEl = el;
        } else {
          // Unused Picture instances should be forgotten
          el.api && el.api.forget && el.api.forget();
        }
      });

      delete item.candidateMediaEls;
    });
  });

  const mosaicEl = html`
    <div
      class="${cn('Mosaic', {
        'u-full': isFull,
        'u-pull': !isFull
      })}"
    >
      <div class="Mosaic-items">
        ${items.map(({ id, mediaEl, captionEl, flexBasisPct, rowLength }, index) => {
          const itemEl = html`
            <div
              class="Mosaic-item"
              style="flex: 0 1 ${flexBasisPct}%; max-width: ${flexBasisPct}%"
              data-id="${id || 'n/a'}"
              data-index="${index}"
              data-row-length="${rowLength}"
              tabindex="-1"
            >
              ${mediaEl} ${captionEl}
            </div>
          `;

          if (captionEl) {
            const captionLinkEl = $('a', captionEl);

            if (captionLinkEl) {
              captionLinkEl.setAttribute('tabindex', '-1');
            }
          }

          return itemEl;
        })}
      </div>
      ${masterCaptionEl}
    </div>
  `;

  styles.use();

  return mosaicEl;
};

export default Mosaic;

export const transformSection = section => {
  const [, rowLengthsString] = `${section.name}${section.configString}`.match(ROW_LENGTHS_PATTERN) || [null, ''];
  const ratios = getRatios(section.configString);
  const isFull = section.configString.indexOf('full') > -1;
  const unlink = section.configString.indexOf('unlink') > -1;

  const nodes = [].concat(section.betweenNodes);

  const config = nodes.reduce(
    (config, node) => {
      detach(node);

      if (!isElement(node)) {
        return config;
      }

      const isQuote = node.matches(SELECTORS.QUOTE);
      const imgEl = getChildImage(node);
      const videoId = isPrefixedMount(node, 'video')
        ? getMountValue(node).match(VIDEO_MARKER_PATTERN)[1]
        : detectVideoId(node);

      if (videoId) {
        const candidateVideoPlayerEls = [
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
        const videoCaptionEl = createCaptionFromElement(node, unlink);

        // Videos that don't have captions right now can append them them later using metadata
        if (!videoCaptionEl) {
          candidateVideoPlayerEls.forEach(
            el =>
              (el.api.metadataHook = ({ alternativeText }) => {
                if (alternativeText) {
                  append(videoPlayerEl.parentElement, Caption({ text: alternativeText, attribution: 'ABC News' }));
                }
              })
          );
        }

        config.items.push({
          id: videoId,
          candidateMediaEls: candidateVideoPlayerEls,
          captionEl: videoCaptionEl
        });
      } else if (imgEl) {
        const src = imgEl.src;
        const imageDoc = lookupImageByAssetURL(src);
        const alt = imgEl.getAttribute('alt');
        const linkUrl = imageDoc ? `/news/${imageDoc.id}` : null;

        config.items.push({
          id: imageDoc ? imageDoc.id : src,
          candidateMediaEls: [
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
          captionEl: imageDoc ? createCaptionFromTerminusDoc(imageDoc, unlink) : createCaptionFromElement(node, unlink)
        });
      } else if (isQuote) {
        config.items.push({
          candidateMediaEls: [
            RichtextTile({
              el: createQuoteFromElement(node, {
                isPullquote: true
              }),
              ratios: {
                sm: ratios.sm || '3x2',
                md: ratios.md || '16x9',
                lg: ratios.lg || '16x9',
                xl: ratios.xl || '16x9'
              }
            }),
            RichtextTile({
              el: createQuoteFromElement(node, {
                isPullquote: true
              }),
              ratios: {
                sm: ratios.sm || '1x1',
                md: ratios.md || '3x2',
                lg: ratios.lg || '3x2',
                xl: ratios.xl || '3x2'
              }
            }),
            RichtextTile({
              el: createQuoteFromElement(node, {
                isPullquote: true
              }),
              ratios: {
                sm: ratios.sm || '3x4',
                md: ratios.md || '4x3',
                lg: ratios.lg || '4x3',
                xl: ratios.xl || '4x3'
              }
            })
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
      rowLengths: rowLengthsString.split(''),
      isFull
    }
  );

  delete config.masterCaptionText;
  delete config.masterCaptionAttribution;

  section.substituteWith(Mosaic(config), []);
};

export const transformBeforeAndAfterMarker = marker => {
  const componentEl = marker.node.nextElementSibling;
  const imgEls = $$('img', componentEl).reverse();
  const captionText = $('figcaption', componentEl).textContent;
  const config = {
    items: imgEls.map(imgEl => {
      const src = imgEl.src;
      const imageDoc = lookupImageByAssetURL(src);
      const alt = imgEl.getAttribute('alt');
      const linkUrl = imageDoc ? `/news/${imageDoc.id}` : null;

      return {
        id: imageDoc ? imageDoc.id : src,
        mediaEl: Picture({
          src,
          alt,
          ratios: {
            sm: '16x9',
            md: '16x9',
            lg: '16x9',
            xl: '16x9'
          },
          shouldLazyLoad: false,
          linkUrl
        })
      };
    }),
    isFull: true,
    masterCaptionEl: Caption({
      text: captionText
    }),
    rowLengths: [2]
  };

  const mosaic = Mosaic(config);
  const id = Math.floor(Math.random() * 1e8).toString(16);
  const fullWidthTileHack = document.createElement('style');

  fullWidthTileHack.innerHTML = `@media (max-width: 978px) { [data-before-and-after="${id}"] .Mosaic-item { flex: 0 1 100% !important; max-width: 100% !important } }`;
  mosaic.setAttribute('data-before-and-after', id);
  append(mosaic, fullWidthTileHack);
  marker.substituteWith(mosaic);
  detach(componentEl);
};
