export const conditionallyApply = el => {
  if (el !== null && el.tagName === 'P' && el.textContent.length > 80) {
    el.classList.add('u-dropcap');
  }
};
