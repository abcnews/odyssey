// @ts-check
import cn from 'classnames';
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
  // `#pullfull` also gets `u-full` so its contents span the page width. It skips the `u-richtext`
  // wrapper because full-width lines of text are unreadable; it's intended for embeds/iframes.
  const isFull = type === 'full';

  // Wrap in richtext styles only when the section starts with text rather than an embed
  const [firstNode] = nodes;
  const isFirstNodeElement = isElement(firstNode);
  const isFirstNodeEmbed = isFirstNodeElement && EMBED_TAGNAMES.includes(firstNode.tagName);
  const isRichtext = !isFull && isFirstNodeElement && !isFirstNodeEmbed;

  // e.g. `u-pull`, `u-pull-in`, `u-pull-full u-full`
  const pullClassName = type ? `u-pull-${type}` : 'u-pull';
  const className = cn(pullClassName, { 'u-full': isFull });

  const scheme = meta.isDarkMode ? 'dark' : 'light';

  return html`
    <div class="${className}">
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
