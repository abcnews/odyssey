// External
const html = require('bel');

// Ours
const { append } = require('../../utils/dom');
require('./index.scss');

function Comments() {
  const livefyreRootEl = html`
    <div class="Comments-livefyreRoot u-layout"></div>
  `;

  if (ABC.News.Mobile) {
    append(
      livefyreRootEl,
      html`
        <h2>Have your say</h2>
      `
    );
  }

  if (ABC.News.initLivefyre) {
    ABC.News.initLivefyre(() => {
      ABC.News.Livefyre.initComments({
        el: livefyreRootEl,
        config: {
          /* [1] */
        }
      });
    });
  }

  return html`
    <div class="Comments u-full">${livefyreRootEl}</div>
  `;
}

module.exports = Comments;

// [1] Config options: https://stash.abc-dev.net.au/projects/NEWS/repos/interactive-livefyre/browse/src/initComments.js
