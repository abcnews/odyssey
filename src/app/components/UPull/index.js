// @ts-check
import html from 'nanohtml';
import { EMBED_TAGNAMES, THEME } from '../../constants';
import { isElement } from '../../utils/dom';

/**
 * @typedef {Object} UPullConfig
 * @prop {Partial<import('src/app/meta').MetaData>} meta
 * @prop {string} type
 * @prop {Node[]} nodes
 */

/**
 * Create a UPull component
 * @param {UPullConfig} config
 * @returns {HTMLElement}
 */
const UPull = ({ meta = {}, type, nodes = [] }) => {
  const isRichtext = nodes.length > 0 && isElement(nodes[0]) && EMBED_TAGNAMES.indexOf(nodes[0].tagName) === -1;
  const scheme = meta.isDarkMode ? 'dark' : 'light';

  return html`
    <div class="u-pull${type ? `-${type}` : ''}">
      ${isRichtext
        ? html`<div data-scheme="${scheme}" data-theme="${THEME}" class="u-richtext${meta.isDarkMode ? '-invert' : ''}">
            ${nodes}
          </div>`
        : nodes}
    </div>
  `;
};

export default UPull;

export const transformSection = (section, meta) => {
  section.substituteWith(
    UPull({
      meta,
      type: section.configString,
      nodes: section.betweenNodes
    }),
    []
  );
};
