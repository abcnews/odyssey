// @ts-check

/**
 * Only apply the dropcap class to text elements where it won't look silly.
 * @param {Element|null} el
 * @param {boolean} isFuture
 */
export const conditionallyApply = (el, isFuture = false) => {
  if (el !== null && el.tagName === 'P' && (el.textContent?.length || 0) > (isFuture ? 140 : 80)) {
    el.classList.add('u-dropcap');
  }
};
