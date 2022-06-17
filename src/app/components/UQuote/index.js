import smartquotes from '../../utils/smartquotes';

const BEGINS_WITH_LEFT_DOUBLE_QUOTATION_MARK_PATTERN = /^\u201c/;

export const conditionallyApply = (el, isPullquote) => {
  // Avoid anything containing PL's lazy loaded image fallback <noscript> markup
  if (el.querySelector('noscript') !== null) {
    return;
  }

  smartquotes(el);

  if (!isPullquote && el.tagName === 'P' && BEGINS_WITH_LEFT_DOUBLE_QUOTATION_MARK_PATTERN.test(el.textContent)) {
    el.classList.add('u-quote');
  }
};
