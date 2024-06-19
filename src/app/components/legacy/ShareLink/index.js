import { dataLayer } from '@abcaustralia/analytics-datalayer';
import cn from 'classnames';
import html from 'nanohtml';
import styles from './index.lazy.scss';
import { getMeta } from '../../../meta/index';

const PATHS = {
  email:
    'M33.2 20.864v8.507c0 .473-.168.876-.504 1.212-.335.336-.74.504-1.21.504H15.714c-.47 0-.875-.168-1.21-.504-.336-.336-.504-.74-.504-1.21v-8.508c.314.35.675.66 1.082.932 2.586 1.758 4.36 2.99 5.325 3.697.407.3.738.534.99.702.255.168.592.34 1.014.514.422.174.815.26 1.18.26h.02c.365 0 .758-.086 1.18-.26.42-.176.758-.347 1.012-.515.253-.168.584-.402.99-.702 1.215-.88 2.994-2.11 5.337-3.697.406-.278.763-.59 1.07-.932zm0-3.15c0 .565-.175 1.104-.525 1.618-.35.514-.786.954-1.307 1.318-2.686 1.864-4.357 3.025-5.014 3.482-.072.05-.224.16-.456.327s-.425.302-.578.406c-.154.104-.34.22-.558.348-.217.13-.423.225-.616.29-.192.064-.37.096-.535.096h-.02c-.165 0-.344-.032-.536-.096-.193-.065-.4-.16-.616-.29-.218-.128-.404-.244-.558-.348-.153-.104-.346-.24-.578-.407-.232-.17-.384-.278-.456-.328-.65-.457-1.585-1.11-2.807-1.955-1.222-.847-1.954-1.356-2.197-1.527-.443-.3-.86-.712-1.254-1.237-.394-.526-.59-1.013-.59-1.463 0-.557.148-1.02.445-1.393.296-.37.72-.557 1.27-.557h15.77c.465 0 .867.168 1.206.504.34.335.51.74.51 1.21z',
  facebook:
    'M21.816 34v-9.393H19v-3.363h2.816V18.35c0-2.27 1.644-4.35 5.48-4.35 1.532 0 2.685.14 2.685.14l-.093 3.153-2.44-.017c-1.378 0-1.605.57-1.605 1.49v2.478H30l-.19 3.363h-3.968V34h-4.026',
  native: 'M28 25.875s-12.724-2.583-15.997 7.5c0 0-.585-15 15.998-15v-3.75l7.999 7.5-8 7.5v-3.75z',
  twitter:
    'M34 18.003c-.565.856-1.258 1.626-2.048 2.226v.546C31.952 26.46 27.84 33 20.29 33c-2.306 0-4.467-.72-6.29-1.935.323.052.66.07.984.07 1.92 0 3.693-.686 5.097-1.85-1.79-.034-3.306-1.267-3.838-2.98.258.053.516.087.774.087.37 0 .742-.052 1.08-.154-1.87-.394-3.29-2.123-3.29-4.212v-.05c.565.324 1.194.512 1.855.53-1.095-.77-1.82-2.072-1.82-3.56 0-.79.208-1.542.563-2.176 2.016 2.603 5.032 4.315 8.452 4.486-.08-.308-.113-.634-.113-.976 0-2.363 1.84-4.28 4.097-4.28 1.176 0 2.257.514 3 1.352.934-.205 1.805-.547 2.595-1.044-.306.993-.95 1.85-1.79 2.38.823-.103 1.613-.343 2.355-.685'
};

async function trackShare(socialNetwork) {
  const { url } = await getMeta();
  dataLayer.event('share', { socialNetwork, url });
}

function native({ id, url, title, description }) {
  navigator.share({ text: description, title, url }).then(() => trackShare(id));
}

const ShareLink = ({ link, shouldBlend }) => {
  const className = cn('ShareLink', { 'u-blend-luminosity': shouldBlend });

  styles.use();

  if (link.id === 'native') {
    return html`
      <button class="${className}" data-id=${link.id} onclick="${() => native(link)}" aria-label="Share this story">
        ${ShareLinkIcon(link.id)}
      </button>
    `;
  }

  return html`
    <a
      class="${className}"
      data-id=${link.id}
      href="${link.url}"
      onclick="${() => trackShare(link.id)}"
      aria-label="Share this story via ${link.id}"
    >
      ${ShareLinkIcon(link.id)}
    </a>
  `;
};

const ShareLinkIcon = id => {
  return html`
    <svg class="ShareLinkIcon" width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path d="${PATHS[id]}" />
    </svg>
  `;
};

export default ShareLink;
