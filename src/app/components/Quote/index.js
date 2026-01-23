// @ts-check
import cn from 'classnames';
import html from 'nanohtml';
import { ALIGNMENT_PATTERN, MOCK_NODE } from '../../constants';
import { $, $$, isElement, substitute } from '../../utils/dom';
import { grabPrecedingConfigString } from '../../utils/mounts';
import { conditionallyApply as conditionallyApplyUQuote } from '../UQuote';
import styles from './index.lazy.scss';

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

  styles.use();

  return html` <div class="${className}">${parEls.concat(attributionEl)}</div> `;
};

export default Quote;

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

  const config = {
    isPullquote: componentName === 'Pullquote' || componentName === 'EmphasisedText',
    alignment,

    // The News Web EmphasisedText component returns contents as either
    // paragraph(s), or a combo of blockquote+span depending on the text.
    parEls: $$('p,blockquote,span', clone),

    // These can no longer be created in Core, but still exist in articles created before the upgrade to CM10.
    attributionNodes: ($('cite', clone) || MOCK_NODE).childNodes
  };

  return Quote({ ...config, ...(typeof options === 'object' ? options : {}) });
};

export const transformElement = (el, options) => {
  const component = createFromElement(el, options);
  if (!component) return;
  substitute(el, component);
};
