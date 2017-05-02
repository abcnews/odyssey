// External
const cn = require('classnames');
const html = require('bel');

module.exports = function Main(childNodes, meta) {
  const className = cn('Main', 'u-layout', 'u-richtext', {
    'has-caption-attributions': meta.hasCaptionAttributions
  });

  return html`
    <main class="${className}">
      ${childNodes}
    </main>
  `;
};
