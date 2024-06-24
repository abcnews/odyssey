declare module '*.lazy.scss';

interface Window {
  __NEXT_DATA__: any; // TODO: define this type
  YT: any; // The YouTube iframe player API
  onYouTubeIframeAPIReady: () => void;
}
