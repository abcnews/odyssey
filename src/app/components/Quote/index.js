import cn from 'classnames';
import html from 'bel';
import { ALIGNMENT_PATTERN, MOCK_NODE } from '../../../constants';
import { $, $$, isElement, substitute } from '../../utils/dom';
import { grabPrecedingConfigString } from '../../utils/mounts';
import { conditionallyApply as conditionallyApplyUQuote } from '../UQuote';
import './index.scss';

const Quote = ({ isPullquote = false, alignment, parEls = [], attributionNodes = [] }) => {
  const className = cn('Quote', {
    'is-pullquote': isPullquote,
    [`u-pull-${alignment}`]: alignment
  });
  const attributionEl = attributionNodes.length
    ? html`
        <footer>
          ${Array.from(attributionNodes).map(node => {
            return node.tagName === 'A' ? html`<cite>${node}</cite>` : node;
          })}
        </footer>
      `
    : null;

  // Smart double quotes & indentation
  if (parEls.length) {
    parEls.forEach(parEl => conditionallyApplyUQuote(parEl, isPullquote));
  }

  return html`
    <div class="${className}">
      <blockquote>${parEls.concat(attributionEl)}</blockquote>
    </div>
  `;
};

export default Quote;

export const createFromElement = (el, options) => {
  if (!isElement(el)) {
    return null;
  }

  const configString = grabPrecedingConfigString(el);
  const [, alignment] = configString.match(ALIGNMENT_PATTERN) || [];
  const clone = el.cloneNode(true);
  const componentName = clone.getAttribute('data-component');

  const config = {
    isPullquote: componentName === 'Pullquote' || componentName === 'EmphasisedText',
    alignment,
    parEls: $$('p', clone),
    attributionNodes: ($('cite', clone) || MOCK_NODE).childNodes
  };

  return Quote({ ...config, ...(typeof options === 'object' ? options : {}) });
};

export const transformElement = (el, options) => {
  substitute(el, createFromElement(el, options));
};
