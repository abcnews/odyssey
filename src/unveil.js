const ATTR = 'veiled';
const CSS = `
html[${ATTR}] {
  overflow: hidden;
  max-height: 100%;
}
html:not([${ATTR}]) > body {
  will-change: opacity;
  transition: opacity cubic-bezier(.25, .46, .45, .94) 1s;
}
html[${ATTR}] > body {
  opacity: 0;
  pointer-events: none;
}
`;

if (!window.unveil) {
  const htmlEl = document.documentElement;
  const headEl = document.head;
  const styleEl = document.createElement('style');
  let timeout;

  if (styleEl.styleSheet) {
    styleEl.styleSheet.cssText = CSS;
  } else {
    styleEl.textContent = CSS;
  }

  headEl.appendChild(styleEl);
  htmlEl.setAttribute(ATTR, '');

  window.unveil = () => {
    clearTimeout(timeout);
    htmlEl.removeAttribute(ATTR);
  };
  timeout = setTimeout(window.unveil, 2000);
  window.addEventListener('odyssey:api', unveil);
}
