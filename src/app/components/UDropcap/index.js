// @ts-check

/**
 * Only apply the dropcap class to text elements where it won't look silly.
 * @param {Element|null} el
 */
export const conditionallyApply = el => {
  if (el !== null && el.tagName === 'P' && (el.textContent?.length || 0) > 80) {
    el.classList.add('u-dropcap');
  }
};
