// External
const cn = require('classnames');
const html = require('bel');

// Ours
require('./index.scss');

module.exports = function Main(childNodes, meta) {
  const className = cn('Main', 'u-layout', {
    'u-richtext': !meta.isDarkMode,
    'u-richtext-invert': meta.isDarkMode,
    'has-caption-attributions': meta.hasCaptionAttributions
  });

  return html`
    <main class="${className}">${childNodes}</main>
  `;
};
