// External
const cn = require('classnames');
const html = require('bel');

// Ours
const { edition, hasCaptionAttributions, isDarkMode } = require('../../env');
require('./index.scss');

module.exports = function Main(childNodes) {
  const className = cn('Main', 'u-layout', {
    'u-richtext': !isDarkMode,
    'u-richtext-invert': isDarkMode,
    'has-caption-attributions': hasCaptionAttributions
  });

  return html`
    <main class="${className}" data-edition="${edition}">${childNodes}</main>
  `;
};
