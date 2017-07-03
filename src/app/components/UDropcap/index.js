const BEGINS_WITH_ALPHANUMERIC_PATTERN = /^\w/;

function conditionallyApply(el) {
  if (
    el !== null &&
    el.tagName === 'P' &&
    el.textContent.length > 80 &&
    BEGINS_WITH_ALPHANUMERIC_PATTERN.test(el.textContent)
  ) {
    el.classList.add('u-dropcap');
  }
}

module.exports.conditionallyApply = conditionallyApply;
