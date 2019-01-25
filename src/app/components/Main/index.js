// External
import html from 'bel';
import cn from 'classnames';

// Ours
import './index.scss';

function Main(childNodes, meta) {
  const className = cn('Main', 'u-layout', {
    'u-richtext': !meta.isDarkMode,
    'u-richtext-invert': meta.isDarkMode,
    'has-caption-attributions': meta.hasCaptionAttributions
  });

  return html`
    <main class="${className}">${childNodes}</main>
  `;
}

export default Main;
