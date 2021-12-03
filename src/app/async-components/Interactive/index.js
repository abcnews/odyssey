// External
const { TIERS, getTier } = require('@abcnews/env-utils');
const useSWR = require('swr').default;
const React = require('react');
const { useEffect, useRef } = require('react');

// Ours
require('./index.scss');

const SUPPORTED_PROVIDER_TYPES = ['singleTweet'];
const LOADERS_ENDPOINT = `https://${
  getTier() === TIERS.LIVE ? 'www.abc.net.au' : 'master-news-web.news-web-developer.presentation-layer.abc-prod.net.au'
}/news-web/api/loader/`;
const LOADER_NAME = 'oembed';

const fetcher = (...args) => fetch(...args).then(res => res.json());

module.exports = props => {
  const ref = useRef(null);
  const { data, error } = useSWR(
    `${LOADERS_ENDPOINT}${LOADER_NAME}?${new URLSearchParams({
      alignment: props.alignment,
      providerType: props.providerType,
      url: props.embedURL
    }).toString()}`,
    fetcher
  );

  useEffect(() => {
    if (!data) {
      return;
    }

    switch (props.providerType) {
      case 'singleTweet':
        if (window.twttr) {
          twttr.widgets.load(ref.current);
        }
        break;
      default:
        break;
    }
  }, [data]);

  if (!SUPPORTED_PROVIDER_TYPES.includes(props.providerType)) {
    return <HiddenErrorMessage message="Unsupported provider type" {...props} />;
  }

  if (error) {
    return <HiddenErrorMessage message={`Error loading data: "${String(error)}"`} {...props} />;
  }

  if (!data) {
    return <>Loading...</>;
  }

  return <div className="PresentationLayer__Interactive" ref={ref} dangerouslySetInnerHTML={{ __html: data.html }} />;
};

const HiddenErrorMessage = ({ message, ...props }) => (
  <pre className="PresentationLayer__HiddenErrorMessage">{`${message}. Props: ${JSON.stringify(props, null, 2)}`}</pre>
);
