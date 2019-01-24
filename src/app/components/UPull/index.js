// External
const html = require('bel');

// Ours
const { EMBED_TAGNAMES } = require('../../../constants');
const { isElement } = require('../../utils/dom');

function UPull({ meta = {}, type, nodes = [] }) {
  const isRichtext = nodes.length > 0 && isElement(nodes[0]) && EMBED_TAGNAMES.indexOf(nodes[0].tagName) === -1;

  return html`
    <div class="u-pull${type ? `-${type}` : ''}">
      ${
        isRichtext
          ? html`
              <div class="u-richtext${meta.isDarkMode ? '-invert' : ''}">${nodes}</div>
            `
          : nodes
      }
    </div>
  `;
}

function transformSection(section, meta) {
  section.substituteWith(
    UPull({
      meta,
      type: section.configSC,
      nodes: section.betweenNodes
    }),
    []
  );
}

module.exports = UPull;
module.exports.transformSection = transformSection;
