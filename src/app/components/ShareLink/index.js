// External
const html = require('bel');

module.exports = function ShareLink(link) {
  return html`
    <a class="ShareLink ShareLink--${link.id}" href="${link.href}"
      title="Share this story via ${link.id}"></a>
  `;
};
