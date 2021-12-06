// External
const { TIERS, getTier } = require('@abcnews/env-utils');
const useSWRImmutable = require('swr/immutable').default;
const React = require('react');
const { useLayoutEffect, useRef } = require('react');

// Ours
require('./index.scss');

const SUPPORTED_PROVIDER_TYPES = ['singleTweet', 'instagram'];
const LOADERS_ENDPOINT = `https://${
  getTier() === TIERS.LIVE ? 'www.abc.net.au' : 'master-news-web.news-web-developer.presentation-layer.abc-prod.net.au'
}/news-web/api/loader/`;
const LOADER_NAME = 'oembed';

const fetcher = (...args) => fetch(...args).then(res => res.json());

module.exports = props => {
  const ref = useRef(null);
  const { data, error } = useSWRImmutable(
    `${LOADERS_ENDPOINT}${LOADER_NAME}?${new URLSearchParams({
      alignment: props.alignment,
      providerType: props.providerType,
      url: props.embedURL
    }).toString()}`,
    fetcher
  );

  useLayoutEffect(() => {
    if (!data) {
      return;
    }

    ref.current.innerHTML = '';
    ref.current.appendChild(document.createRange().createContextualFragment(data.html));

    // Additional steps to take, in case 3rd party libraries had already been loaded and executed
    switch (props.providerType) {
      case 'singleTweet':
        if (window.twttr) {
          twttr.widgets.load(ref.current);
        }
        break;
      case 'instagram':
        if (window.instgrm) {
          instgrm.Embeds.process();
        }
        break;
      default:
        break;
    }
  }, [data]);

  let placeholder = null;

  if (!SUPPORTED_PROVIDER_TYPES.includes(props.providerType)) {
    placeholder = <HiddenErrorMessage message="Unsupported provider type" {...props} />;
  } else if (error) {
    placeholder = <HiddenErrorMessage message={`Error loading data: "${String(error)}"`} {...props} />;
  } else if (!data) {
    placeholder = <>Loading…</>;
  }

  return (
    <div className="PresentationLayer__Interactive" ref={ref}>
      {placeholder}
    </div>
  );
};

const HiddenErrorMessage = ({ message, ...props }) => (
  <pre className="PresentationLayer__HiddenErrorMessage">{`${message}. Props: ${JSON.stringify(props, null, 2)}`}</pre>
);
