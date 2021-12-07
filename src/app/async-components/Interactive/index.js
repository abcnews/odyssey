// External
const { TIERS, getTier } = require('@abcnews/env-utils');
const useSWRImmutable = require('swr/immutable').default;
const React = require('react');
const { useLayoutEffect, useRef } = require('react');

// Ours
require('./index.scss');

const SUPPORTED_PROVIDER_TYPES = ['facebook', 'facebookVideo', 'instagram', 'singleTweet'];
const LOADERS_ENDPOINT = `https://${
  getTier() === TIERS.LIVE ? 'www.abc.net.au' : 'master-news-web.news-web-developer.presentation-layer.abc-prod.net.au'
}/news-web/api/loader/`;
const LOADER_NAME = 'oembed';

const fetcher = (...args) => fetch(...args).then(res => res.json());

module.exports = props => {
  const { alignment, embedURL, providerType } = props;
  const ref = useRef(null);
  const { data, error } = useSWRImmutable(
    `${LOADERS_ENDPOINT}${LOADER_NAME}?${new URLSearchParams({
      alignment,
      providerType,
      url: embedURL
    }).toString()}`,
    fetcher
  );

  useLayoutEffect(() => {
    if (!data) {
      return;
    }

    const normalisedHTML = normaliseHTML(data.html, providerType);
    const documentFragment = document.createRange().createContextualFragment(normalisedHTML);

    ref.current.innerHTML = '';
    ref.current.appendChild(documentFragment);

    // Additional steps to take, in case 3rd party libraries had already been loaded and executed
    switch (providerType) {
      case 'facebook':
      case 'facebookVideo':
        if (window.FB) {
          FB.XFBML.parse(ref.current);
        }
        break;
      case 'instagram':
        if (window.instgrm) {
          instgrm.Embeds.process();
        }
        break;
      case 'singleTweet':
        if (window.twttr) {
          twttr.widgets.load(ref.current);
        }
        break;
      default:
        break;
    }
  }, [data]);

  let placeholder = null;

  if (!SUPPORTED_PROVIDER_TYPES.includes(providerType)) {
    placeholder = <HiddenErrorMessage message="Unsupported provider type" {...props} />;
  } else if (error) {
    placeholder = <HiddenErrorMessage message={`Error loading data: "${String(error)}"`} {...props} />;
  } else if (!data) {
    placeholder = <>Loading…</>;
  }

  return (
    <div ref={ref} className="PresentationLayer__Interactive" data-provider={providerType}>
      {placeholder}
    </div>
  );
};

const HiddenErrorMessage = ({ message, ...props }) => (
  <pre className="PresentationLayer__HiddenErrorMessage">{`${message}. Props: ${JSON.stringify(props, null, 2)}`}</pre>
);

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
