// Ours
const { smartquotes } = require('../../utils/misc');

const BEGINS_WITH_LEFT_DOUBLE_QUOTATION_MARK_PATTERN = /^\u201c/;

function conditionallyApply(el, isPullquote) {
  smartquotes(el);

  if (!isPullquote && el.tagName === 'P' && BEGINS_WITH_LEFT_DOUBLE_QUOTATION_MARK_PATTERN.test(el.textContent)) {
    el.classList.add('u-quote');
  }
}

module.exports.conditionallyApply = conditionallyApply;
