// External
const capiFetch = require('@abcnews/capi-fetch').default;
const html = require('bel');

// Ours
const { invalidateClient } = require('../../scheduler');
const { track } = require('../../utils/behaviour');
const Picture = require('../Picture');
require('./index.scss');

const PICTURE_RATIOS = {
  sm: '16x9',
  md: '16x9',
  lg: '16x9',
  xl: '16x9'
};

function Recirculation({ ids, pull }) {
  const itemEls = ids.map(
    id =>
      html`
        <a class="Recirculation-item" href="/news/${id}" onclick="${() => track('recirculation-link', id)}"></a>
      `
  );

  const el = html`
    <aside class="Recirculation${pull ? ` u-pull-${pull}` : ''}" role="complementary">${itemEls}</aside>
  `;

  el.classList.add('has-children');
  ids.forEach((id, index) =>
    capiFetch(id, (err, item) => {
      if (err) {
        itemEl.classList.add('is-missing');

        return console.error(err);
      }

      const itemEl = itemEls[index];
      const title = item.shortTeaserTitle || item.teaserTitle || item.title;
      const teaserText = item.shortTeaserTextPlain || item.teaserTextPlain;

      itemEl.appendChild(
        html`
          <h2>${title}</h2>
        `
      );

      if (item.thumbnailLink) {
        itemEl.appendChild(Picture({ src: item.thumbnailLink.media[0].url, ratios: PICTURE_RATIOS }));
        invalidateClient();
      }

      if (item.textPlain.indexOf(teaserText) !== 0) {
        itemEl.appendChild(
          html`
            <p>${teaserText}</p>
          `
        );
      }

      itemEl.appendChild(
        html`
          <div>Read more →</div>
        `
      );

      el.classList.add('has-children');
    })
  );

  return el;
}

const DIGITS_PATTERN = /\d+/;
const PULL_PATTERN = /[a-z]+/;
let nextRelatedStoriesIdsIndex = 0;

function transformMarker(marker, meta) {
  const [digits] = marker.configSC.match(DIGITS_PATTERN) || [1];
  const [pull] = marker.configSC.match(PULL_PATTERN) || ['right'];
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
}

module.exports = Recirculation;
module.exports.transformMarker = transformMarker;
