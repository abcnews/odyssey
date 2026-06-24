// @ts-check
import cn from 'classnames';
import html from 'nanohtml';
import { ALIGNMENT_PATTERN, MOCK_NODE } from '../../constants';
import { $, $$, isElement, substitute } from '../../utils/dom';
import { grabPrecedingConfigString } from '../../utils/mounts';
import { conditionallyApply as conditionallyApplyUQuote } from '../UQuote';
import styles from './index.lazy.scss';
import { stripPLAttributes } from '../../reset';

/**
 *
 * @param {QuoteOptions} options
 */
const Quote = ({ isPullquote = false, alignment, parEls = [], attributionNodes }) => {
  const className = cn('Quote', {
    'is-pullquote': isPullquote,
    [`u-pull-${alignment}`]: alignment
  });
  const attributionEl =
    attributionNodes && attributionNodes.length
      ? html`
          <figcaption>
            ${Array.from(attributionNodes).map(node => {
              return node instanceof HTMLElement && node.tagName === 'A' ? html`<cite>${node}</cite>` : node;
            })}
          </figcaption>
        `
      : null;

  // Smart double quotes & indentation
  if (parEls.length) {
    parEls.forEach(parEl => conditionallyApplyUQuote(parEl, isPullquote));
  }

  styles.use();

  return html` <figure class="${className}">${parEls.concat(attributionEl)}</figure> `;
};

export default Quote;

/**
 *
 * @param {Element} el
 * @param {Partial<QuoteOptions>} options
 * @returns
 */
export const createFromElement = (el, options) => {
  if (!isElement(el)) {
    return null;
  }

  const clone = el.cloneNode(true);
  if (!isElement(clone)) {
    return null;
  }

  const configString = grabPrecedingConfigString(el);
  const [, alignment] = configString.match(ALIGNMENT_PATTERN) || [];

  const componentName = clone instanceof HTMLElement && clone.getAttribute('data-component');

  // Turn specific trailing em elements into cite elements so they can be picked up as attributions below.
  const emCite = $('em:last-child', clone);
  if (emCite?.firstChild?.TEXT_NODE && emCite?.textContent?.match(/^\p{Dash_Punctuation}/u)) {
    emCite.firstChild.textContent = emCite.firstChild.textContent?.replace(/^\p{Dash_Punctuation}/u, '') || null;
    substitute(emCite, html`<cite>${Array.from(emCite.childNodes)}</cite>`);
  }

  // The News Web EmphasisedText component returns contents as either
  // paragraph(s), or a combo of blockquote+span depending on the text.
  const parEls = $$('p,blockquote,span', clone);

  // Remove unwanted PL classes and attributes not removed by reset/index.js
  parEls.forEach(stripPLAttributes);

  const attributionNodes = ($('cite', clone) || MOCK_NODE).childNodes;

  /**
   * @type {QuoteOptions}
   */
  const config = {
    isPullquote: componentName === 'Pullquote' || componentName === 'EmphasisedText',
    alignment,
    parEls,
    // These can no longer be created in Core, but still exist in articles created before the upgrade to CM10.
    attributionNodes
  };

  return Quote({ ...config, ...(typeof options === 'object' ? options : {}) });
};

/**
 * @param {Element} el
 * @param {Partial<QuoteOptions>} [options]
 * @returns
 */
export const transformElement = (el, options = {}) => {
  const component = createFromElement(el, options);
  if (!component) return;
  substitute(el, component);
};
