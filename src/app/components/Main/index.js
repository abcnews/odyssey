// External
const html = require('bel');


module.exports = function Main(childNodes) {
  return html`
    <main class="Main u-layout u-richtext">
      ${childNodes}
    </main>
  `;
};
