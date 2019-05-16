// External
const html = require('bel');

// Ours
const { track } = require('../../utils/behaviour');

require('./index.scss');

function native({ id, url, title, description }) {
  navigator.share({ text: description, title, url }).then(() => track('share-link', id));
}

module.exports = function ShareLink({ link, shouldBlend }) {
  const className = `ShareLink ShareLink--${link.id}${shouldBlend ? ' u-blend-luminosity' : ''}`;

  if (link.id === 'native') {
    return html`
      <button class="${className}" onclick="${() => native(link)}" aria-label="Share this story"></button>
    `;
  }

  return html`
    <a
      class="${className}"
      href="${link.url}"
      onclick="${() => track('share-link', link.id)}"
      aria-label="Share this story via ${link.id}"
    ></a>
  `;
};
