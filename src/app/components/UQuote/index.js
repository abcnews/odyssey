// Ours
import smartquotes from '../../utils/smartquotes';

const BEGINS_WITH_LEFT_DOUBLE_QUOTATION_MARK_PATTERN = /^\u201c/;

export function conditionallyApply(el) {
  smartquotes(el);

  if (el.tagName === 'P' && BEGINS_WITH_LEFT_DOUBLE_QUOTATION_MARK_PATTERN.test(el.textContent)) {
    el.classList.add('u-quote');
  }
}
