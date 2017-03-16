// External
const html = require('bel');

// Ours
const {EMBED_TAGNAMES} = require('../../../constants');
const {isElement} = require('../../../utils');

function UPull({
  type,
  nodes = []
}) {
  const className = `u-pull${type ? `-${type}` : ''}`;

  const isRichtext = nodes.length > 0 &&
    isElement(nodes[0]) &&
    EMBED_TAGNAMES.indexOf(nodes[0].tagName) === -1;

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
    type: section.suffix,
    nodes
  }));
}

module.exports = UPull;
module.exports.transformSection = transformSection;
