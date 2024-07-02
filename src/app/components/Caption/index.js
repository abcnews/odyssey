import cn from 'classnames';
import html from 'nanohtml';
import { MOCK_ELEMENT, MOCK_TEXT } from '../../constants';
import { $, isElement, isText } from '../../utils/dom';
import styles from './index.lazy.scss';

/**
 * @param {Object} config - Config for the caption
 * @param {string} [config.url] - A URL the caption links to
 * @param {string} [config.text] - The caption text
 * @param {string} [config.attribution] - The attribution text
 * @param {boolean} [config.unlink] - Don't use the URL as a link for the caption
 */
const Caption = ({ url, text, attribution, unlink }) => {
  if (!text && !attribution) {
    return null;
  }

  const className = cn('Caption', {
    'has-long-attribution': attribution && attribution.length > 50
  });

  styles.use();

  return html`
    <p class="${className}" title="${text}${attribution ? ` (${attribution})` : ''}">
      ${url && !unlink ? html`<a href="${url}">${text}</a>` : html`<span>${text}</span>`}
      ${attribution ? html`<em class="Caption-attribution">${attribution}</em> ` : null}
    </p>
  `;
};

export default Caption;

export const createFromTerminusDoc = (doc, unlink) =>
  Caption({
    url: `/news/${doc.id}`,
    text: doc.caption,
    attribution: doc.byLine && !doc.byLine.type ? doc.byLine.plain : doc.attribution || null,
    unlink
  });

export const createFromElement = (el, unlink) => {
  if (!isElement(el)) {
    return null;
  }

  // Sometimes the element is left/right aligned and wrapped in a pull.
  // We need to go one level deeper before cloning/matching.
  if (el.className.indexOf('u-pull-') > -1) {
    el = el.firstElementChild;
  }

  if (el.getAttribute('data-component') !== 'Figure') {
    return null;
  }

  const clone = el.cloneNode(true);
  const config = {
    url: `/news/${clone.getAttribute('id')}`,
    text: [MOCK_TEXT]
      .concat(Array.from(($('figcaption', clone) || MOCK_ELEMENT).childNodes))
      .filter(isText)
      .sort((a, b) => b.nodeValue.length - a.nodeValue.length)[0].nodeValue,
    attribution: (($('cite', clone) || MOCK_ELEMENT).textContent || '').slice(1, -1).trim(),
    unlink
  };

  return Caption(Object.assign(config));
};
