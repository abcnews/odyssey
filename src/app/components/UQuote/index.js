// Ours
const {getDescendantTextNodes} = require('../../../utils');

const LEFT_DOUBLE_QUOTATION_MARK = '“';
const RIGHT_DOUBLE_QUOTATION_MARK = '”';
const HAIR_SPACE = ' ';
const ZERO_WIDTH_NO_BREAK_SPACE = '\uFEFF';
const NO_BREAK_HAIR_SPACE = ZERO_WIDTH_NO_BREAK_SPACE + HAIR_SPACE + ZERO_WIDTH_NO_BREAK_SPACE;
const QUOTATION_MARK_PATTERN = /\"/g;
const BEGINS_WITH_QUOTATION_MARK_PATTERN = /^(“|")/;

function conditionallyApply(el) {
  let toggle = false;

  getDescendantTextNodes(el)
  .forEach(node => {
    if (QUOTATION_MARK_PATTERN.test(node.nodeValue)) {
      node.nodeValue = node.nodeValue.replace(QUOTATION_MARK_PATTERN, () => {
        return (toggle = !toggle) ?
          LEFT_DOUBLE_QUOTATION_MARK + NO_BREAK_HAIR_SPACE :
          NO_BREAK_HAIR_SPACE + RIGHT_DOUBLE_QUOTATION_MARK;
      });
    }
  });

  if (BEGINS_WITH_QUOTATION_MARK_PATTERN.test(el.textContent)) {
    el.classList.add('u-quote');
  }
}

module.exports.conditionallyApply = conditionallyApply;
