// External
const html = require('bel');

function UPull({
  type,
  isRichtext,
  nodes = []
}) {
  const className = `u-pull${type ? `-${type}` : ''}`;

  return html`
    <div class="${className}">
      ${isRichtext ? html`<div class="u-richtext">${nodes}</div>` : nodes}
    </div>
  `;
};

function transformSection(section) {
  const nodes = [].concat(section.betweenNodes);

  section.betweenNodes = [];

  section.replaceWith(UPull({
    type: section.suffix.replace('richtext', ''),
    isRichtext: section.suffix.indexOf('richtext') > -1,
    nodes
  }));
}

module.exports = UPull;
module.exports.transformSection = transformSection;
