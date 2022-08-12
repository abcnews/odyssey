import html from 'nanohtml';
import { invalidateClient } from '../../scheduler';
import { track } from '../../utils/behaviour';
import { getOrFetchDocument } from '../../utils/content';
import Picture from '../Picture';
import styles from './index.lazy.scss';

const PICTURE_RATIOS = {
  sm: '16x9',
  md: '16x9',
  lg: '16x9',
  xl: '16x9'
};

const Recirculation = ({ ids, pull }) => {
  const itemEls = ids.map(
    id => html`<a class="Recirculation-item" href="/news/${id}" onclick="${() => track('recirculation-link', id)}"></a>`
  );

  const el = html`
    <aside class="Recirculation${pull ? ` u-pull-${pull}` : ''}" role="complementary">${itemEls}</aside>
  `;

  el.classList.add('has-children');
  ids.forEach((id, index) =>
    getOrFetchDocument(id)
      .then(doc => {
        const itemEl = itemEls[index];
        const title = doc.titleAlt.md || doc.titleAlt.lg || doc.title;
        const teaser = doc.synopsisAlt.md || doc.synopsisAlt.lg || doc.synopsis;

        itemEl.appendChild(html`<h2>${title}</h2>`);

        if (doc._embedded.mediaThumbnail) {
          itemEl.appendChild(Picture({ src: doc._embedded.mediaThumbnail.complete[0].url, ratios: PICTURE_RATIOS }));
          invalidateClient();
        }

        if (JSON.stringify(doc.text).indexOf(teaser) === -1) {
          itemEl.appendChild(html`<p>${teaser}</p>`);
        }

        itemEl.appendChild(html`<div>Read more →</div>`);

        el.classList.add('has-children');
      })
      .catch(() => itemEls[index].classList.add('is-missing'))
  );

  styles.use();

  return el;
};

export default Recirculation;

const DIGITS_PATTERN = /\d+/;
const PULL_PATTERN = /[a-z]+/;
let nextRelatedStoriesIdsIndex = 0;

export const transformMarker = (marker, meta) => {
  const [digits] = marker.configString.match(DIGITS_PATTERN) || [1];
  const [pull] = marker.configString.match(PULL_PATTERN) || ['right'];
  let ids;

  switch (marker.name) {
    case 'tease':
      if (digits !== 1) {
        ids = [digits];
      }
      break;
    case 'related':
      ids = meta.relatedStoriesIds.slice(nextRelatedStoriesIdsIndex, +digits + nextRelatedStoriesIdsIndex);
      nextRelatedStoriesIdsIndex += ids.length;
      break;
    default:
      break;
  }

  if (ids && ids.length) {
    marker.substituteWith(Recirculation({ ids, pull }));
  }
};
