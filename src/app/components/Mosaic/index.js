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
import { SIZES } from '../Sizer';
import VideoPlayer from '../VideoPlayer';
import styles from './index.lazy.scss';

const ROW_LENGTHS_PATTERN = /mosaic[a-z]*(\d+)/;
const DEFAULT_FORMATTED_RATIO = '3x2';
const DEFAULT_ROW_LENGTH_BASED_RATIOS = [
  {
    sm: '3x2',
    md: '16x9',
    lg: '16x9',
    xl: '16x9'
  },
  {
    sm: '1x1',
    md: '3x2',
    lg: '3x2',
    xl: '3x2'
  },
  {
    sm: '3x4',
    md: '4x3',
    lg: '4x3',
    xl: '4x3'
  }
];

const Mosaic = ({ items = [], masterCaptionEl, isFull = false }) => {
  const mosaicEl = html`
    <div
      class="${cn('Mosaic', {
        'u-full': isFull,
        'u-pull': !isFull
      })}"
    >
      <div class="Mosaic-items">
        ${items.map(({ captionEl, component, componentProps, flexBasisPct, rowLength }) => {
          const mediaEl = component(componentProps);

          const itemEl = html`
            <div
              class="Mosaic-item"
              style="flex: 0 1 ${flexBasisPct}%; max-width: ${flexBasisPct}%"
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
          } else if (component === VideoPlayer) {
            mediaEl.api.metadataHook = ({ alternativeText }) => {
              if (alternativeText) {
                append(itemEl, Caption({ text: alternativeText, attribution: 'ABC News' }));
              }
            };
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
  // Parse options from config string
  const [, definedRowLengthsString] = `${section.name}${section.configString}`.match(ROW_LENGTHS_PATTERN) || [null, ''];
  const definedRowLengths = definedRowLengthsString.split('').map(rowLength => Math.min(3, +rowLength));
  const definedRatios = getRatios(section.configString);
  const isFull = section.configString.indexOf('full') > -1;
  const shouldFormat = section.configString.indexOf('format') > -1;
  const shouldUnlink = section.configString.indexOf('unlink') > -1;

  // Define calculated variables
  const items = [];
  let masterCaptionText = null;
  let masterCaptionAttribution = null;

  // Assign each section node to either an item (image, video or quote) or a part of the master
  // caption. Discard anything that can't be assigned. Each item will have some initial parsed
  // props, which will be completed later.
  [...section.betweenNodes].forEach(node => {
    detach(node);

    if (!isElement(node)) {
      return;
    }

    const formattedRatio =
      node._descriptor && node._descriptor.props.ratio ? node._descriptor.props.ratio : DEFAULT_FORMATTED_RATIO;
    const videoId = isPrefixedMount(node, 'video')
      ? getMountValue(node).match(VIDEO_MARKER_PATTERN)[1]
      : detectVideoId(node);
    const imgEl = getChildImage(node);
    const isQuote = node.matches(SELECTORS.QUOTE);

    if (videoId) {
      items.push({
        component: VideoPlayer,
        componentProps: {
          videoId
        },
        formattedRatio,
        captionEl: createCaptionFromElement(node, shouldUnlink)
      });
    } else if (imgEl) {
      const imageDoc = lookupImageByAssetURL(imgEl.src);

      items.push({
        component: Picture,
        componentProps: {
          src: imgEl.src,
          alt: imgEl.getAttribute('alt'),
          linkUrl: imageDoc ? `/news/${imageDoc.id}` : null
        },
        formattedRatio,
        captionEl: imageDoc
          ? createCaptionFromTerminusDoc(imageDoc, shouldUnlink)
          : createCaptionFromElement(node, shouldUnlink)
      });
    } else if (isQuote) {
      items.push({
        component: RichtextTile,
        componentProps: {
          el: createQuoteFromElement(node, {
            isPullquote: true
          })
        },
        formattedRatio
      });
    } else if (node.tagName === 'P') {
      if (!masterCaptionText) {
        masterCaptionText = node.textContent;
      } else if (!masterCaptionAttribution) {
        masterCaptionAttribution = node.textContent;
      }
    }
  });

  // If we ended up with no items, return an empty component instead of doing more needless work
  if (items.length === 0) {
    return section.substituteWith(html`<div class="Mosaic is-empty"></div>`, []);
  }

  // 1) Group items into rows (adding extra 1-length rows, if needed), then
  // 2) assign `rowLength`, `flexBasisPct` and `componentProps.ratios` values to each item:
  //   - `rowLength` is the number in each grouping.
  //   - `flexBasisPct` is an equal share of 100% if non-formatted, or a ratio-based proportion
  //     which aims to maintain equal height of items in each row
  //   - `componentProps.ratios` is either:
  //     a) the CM10 chosen aspect ratio across all screen sizes for formatted mosaics,
  //     b) marker-defined ratios for one or more screen sizes, or
  //     c) defaults for each row length (defined above) that vary based on screen size.
  items
    .reduce(
      (memo, item, index) => {
        if (definedRowLengths.length === 0) {
          definedRowLengths.push(1);
        }

        memo[memo.length - 1].push(item);

        definedRowLengths[0]--;

        if (definedRowLengths[0] === 0) {
          definedRowLengths.shift();

          if (index + 1 < items.length) {
            memo.push([]);
          }
        }

        return memo;
      },
      [[]]
    )
    .forEach(row => {
      const rowLength = row.length;

      if (shouldFormat) {
        const itemsRatios = row.map(item => item.formattedRatio.split('x').map(value => parseInt(value, 10)));
        const maxVertical = itemsRatios.reduce((max, [, vertical]) => Math.max(max, vertical), 0);
        const scaledHorizontals = itemsRatios.map(([horizontal, vertical]) => horizontal / (vertical / maxVertical));
        const totalHorizontal = scaledHorizontals.reduce((total, scaledHorizontal) => total + scaledHorizontal, 0);

        row.forEach((item, itemIndex) => {
          item.rowLength = rowLength;
          item.flexBasisPct = (100 / totalHorizontal) * scaledHorizontals[itemIndex];
          item.componentProps.ratios = SIZES.reduce(
            (ratios, size) => ({
              ...ratios,
              [size]: item.formattedRatio
            }),
            {}
          );
        });
      } else {
        const defaultRatios = DEFAULT_ROW_LENGTH_BASED_RATIOS[rowLength - 1];

        row.forEach(item => {
          item.rowLength = rowLength;
          item.flexBasisPct = 100 / rowLength;
          item.componentProps.ratios = SIZES.reduce(
            (ratios, size) => ({
              ...ratios,
              [size]: definedRatios[size] || defaultRatios[size]
            }),
            {}
          );
        });
      }
    });

  // Create a master caption if we managed to parse text / attribution
  const masterCaptionEl = masterCaptionText
    ? Caption({
        text: masterCaptionText,
        attribution: masterCaptionAttribution
      })
    : null;

  // Create the mosaic and replace the section with it
  section.substituteWith(
    Mosaic({
      items,
      masterCaptionEl,
      isFull
    }),
    []
  );
};

export const transformBeforeAndAfterMarker = marker => {
  const componentEl = marker.node.nextElementSibling;
  const mosaic = Mosaic({
    items: $$('img', componentEl)
      .reverse()
      .map(imgEl => {
        const imageDoc = lookupImageByAssetURL(imgEl.src);

        return {
          component: Picture,
          componentProps: {
            src: imgEl.src,
            alt: imgEl.getAttribute('alt'),
            linkUrl: imageDoc ? `/news/${imageDoc.id}` : null,
            ratios: {
              sm: '16x9',
              md: '16x9',
              lg: '16x9',
              xl: '16x9'
            },
            shouldLazyLoad: false
          },
          captionEl: imageDoc ? createCaptionFromTerminusDoc(imageDoc, true) : createCaptionFromElement(node, true),
          rowLength: 2,
          flexBasisPct: 50
        };
      }),
    masterCaptionEl: Caption({
      text: $('figcaption', componentEl).textContent
    }),
    isFull: true
  });
  const id = Math.floor(Math.random() * 1e8).toString(16);
  const fullWidthTileHack = document.createElement('style');

  fullWidthTileHack.innerHTML = `@media (max-width: 978px) { [data-before-and-after="${id}"] .Mosaic-item { flex: 0 1 100% !important; max-width: 100% !important } }`;
  mosaic.setAttribute('data-before-and-after', id);
  append(mosaic, fullWidthTileHack);
  marker.substituteWith(mosaic);
  detach(componentEl);
};
