import { TIERS, getTier } from '@abcnews/env-utils';
import cn from 'classnames';
import html from 'nanohtml';
import { ALIGNMENT_PATTERN, EMBED_ALIGNMENT_MAP } from '../../constants';
import { substitute } from '../../utils/dom';
import { grabPrecedingConfigString } from '../../utils/mounts';
import styles from './index.lazy.scss';

const SUPPORTED_PROVIDER_TYPES = [
  'documentcloud',
  'facebook',
  'facebookVideo',
  'instagram',
  'singleTweet',
  'soundcloud',
  'vimeo',
  'youtube',
  'tiktok',
  'youtubeplaylist'
];
const LOADERS_ENDPOINT = `https://${
  getTier() === TIERS.LIVE ? 'www.abc.net.au' : 'master-news-web.news-web-developer.presentation-layer.abc-prod.net.au'
}/news-web/api/loader/`;
const LOADER_NAME = 'oembed';

const InteractiveEmbed = ({ url, providerType, alignment, isFull }) => {
  const isSupportedProviderType = SUPPORTED_PROVIDER_TYPES.indexOf(providerType) > -1;

  if (!isSupportedProviderType) {
    return document.createElement('div');
  }

  const hasAspectRatio = providerType === 'vimeo' || providerType.indexOf('youtube') === 0;
  const className = cn('InteractiveEmbed', {
    [`u-pull-${alignment}`]: !isFull && alignment,
    'u-pull': !isFull && !alignment,
    'u-full': isFull
  });

  const el = html`<div class="${className}" data-provider="${providerType}"></div>`;

  let embedContainerEl = el;

  if (hasAspectRatio) {
    embedContainerEl = html`<div class="InteractiveEmbedAspect" style="--aspect-ratio: ${16 / 9}"></div>`;
    el.appendChild(embedContainerEl);
  }

  embedContainerEl.appendChild(html`<div class="InteractiveEmbedLoader">Loading…</div>`);

  fetch(
    `${LOADERS_ENDPOINT}${LOADER_NAME}?${new URLSearchParams({
      alignment: 'outdentDesktop',
      providerType,
      url
    }).toString()}`
  )
    .then(res => res.json())
    .then(data => {
      const normalisedHTML = normaliseHTML(data.html, providerType);
      const documentFragment = document.createRange().createContextualFragment(normalisedHTML);

      embedContainerEl.innerHTML = '';
      embedContainerEl.appendChild(documentFragment);

      // Additional steps to take, in case 3rd party libraries had already been loaded and executed
      switch (providerType) {
        case 'facebook':
        case 'facebookVideo':
          if (window.FB) {
            FB.XFBML.parse(embedContainerEl);
          }
          break;
        case 'instagram':
          if (window.instgrm) {
            instgrm.Embeds.process();
          }
          break;
        case 'singleTweet':
          if (window.twttr) {
            twttr.widgets.load(embedContainerEl);
          }
          break;
        default:
          break;
      }
    })
    .catch(err => {
      console.error(err);
      embedContainerEl.innerHTML = '';
    });

  styles.use();

  return el;
};

export default InteractiveEmbed;

export const transformElement = el => {
  const url = el.getAttribute('itemid');
  const providerType = el.getAttribute('data-provider');
  const configString = grabPrecedingConfigString(el);
  const descriptorAlignment = el._descriptor ? EMBED_ALIGNMENT_MAP[el._descriptor.props.alignment] : undefined;
  const [, alignment] = configString.match(ALIGNMENT_PATTERN) || [, descriptorAlignment];

  substitute(
    el,
    InteractiveEmbed({
      url,
      providerType,
      alignment,
      isFull: configString.indexOf('full') > -1
    })
  );
};

const normaliseHTML = (html, providerType) => {
  let normalisedHTML = html;

  switch (providerType) {
    case 'facebook':
    case 'facebookVideo':
      normalisedHTML = normalisedHTML
        .replace(/data-width="\w*"/g, 'data-width="auto"')
        .replace(/graph\.facebook\.com/g, 'www.facebook.com');
      break;
    default:
      break;
  }

  return normalisedHTML;
};
