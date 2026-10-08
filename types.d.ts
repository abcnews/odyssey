declare module '*.lazy.scss';

interface Window {
  __NEXT_DATA__: any; // TODO: define this type
  YT: any; // The YouTube iframe player API
  onYouTubeIframeAPIReady: () => void;
  FB: any; // The Facebook embed API
  twttr: any; // The twitter embed API
  instgrm: any; // The instagram embed API
  dataLayer?: any;
}

type TerminusDocumentsUnion = TerminusArticle | TerminusVideo | TerminusImage | TerminusHtmlFragment | TerminusTeaser;

interface TerminusDocument {
  id: string;
  _embedded?: TerminusEmbedded;
}

interface TerminusVideo extends TerminusDocument {
  docType: 'Video';
  caption: string;
  byLine: ByLine;
  title: string;
  media: VideoMedia;
  duration: number;
}

interface TerminusTeaser extends TerminusDocument {
  docType: 'Teaser';
  target?: TargetDoc;
  title: string;
  byLine?: ByLine;
}

interface TerminusImage extends TerminusDocument {
  alt: string;
  canonicalURI: string;
  canonicalURL: string;
  contentSource: 'coremedia';
  contextSettings: ContextSettings;
  dates: Dates;
  docType: 'Image' | 'ImageProxy';
  genre: string;
  isOriginalEnforced: boolean;
  lang: string;
  media: ImageMedia;
  notChildFriendly: boolean;
  rightsHolder: string[];
  title: string;
  titleAlt: TitleAlt;
  version: number;
}

interface TerminusHtmlFragment extends TerminusDocument {
  docType: 'HTMLFragment';
  contextSettings: ContextSettings;
}

interface TerminusArticle extends TerminusDocument {
  canonicalURI: string;
  canonicalURL: string;
  contentSource: string;
  contextSettings: ContextSettings;
  dates: Dates;
  docType: 'Article';
  genre: string;
  id: string;
  importance: number;
  keywords: string[];
  lang: string;
  notChildFriendly: boolean;
  productionUnit: string;
  rightsHolder: string[];
  site: Site;
  source: string;
  sourceURL: string;
  synopsis: string;
  synopsisAlt: {
    lg: string;
    sm: string;
  };
  text: string;
  title: string;
  titleAlt: TitleAlt;
  version: number;
}

interface TerminusEmbedded {
  mediaEmbedded?: EmbeddedUnion[];
  mediaFeatured?: EmbeddedUnion[];
  mediaRelated?: EmbeddedUnion[];
  mediaThumbnail?: ImageDetail;
}

interface TargetDoc {
  id: string;
  docType: string;
}

interface MediaEmbedded {
  id: string;
  title: string;
  _embedded?: TerminusEmbedded;
}

interface EmbeddedImage extends MediaEmbedded {
  docType: 'Image' | 'ImageProxy';
  media?: ImageMedia; // It's possible for the `media` key to be undefined if it's an ImageProxy pointing at a deleted image.
  alt: string;
}
interface EmbeddedVideo extends MediaEmbedded {
  docType: 'Video';
  byLine?: ByLine;
  caption?: string;
  media: VideoMedia;
  duration: number;
}
interface EmbeddedTeaser extends MediaEmbedded {
  docType: 'Teaser';
  _embedded?: TerminusEmbedded;
  target?: TargetDoc;
  byLine?: ByLine;
}

type EmbeddedUnion = EmbeddedImage | EmbeddedVideo | EmbeddedTeaser;

interface VideoMedia {
  image: {
    poster: ImageDetail;
  };
  video: {
    renditions: {
      files: VideoSource[];
    };
  };
}

interface ImageMedia {
  image: {
    primary: ImageDetail;
  };
}

interface ImageDetail {
  alt: string;
  binaryKey: string;
  caption: string;
  complete: Complete[];
  crops: Crops;
  images: Images;
  notChildFriendly: boolean;
  originalInfo: OriginalInfo;
  ratios: { [key: string]: RatioValue };
}

interface VideoSource {
  size: number;
  width: number;
  height: number;
  url: string;
}

interface Complete {
  cropHeight: number;
  cropWidth: number;
  height: number;
  ratio: '16x9' | '1x1' | '3x2' | '3x4' | '4x3' | '9x16';
  url: string;
  width: number;
  x: number;
  y: number;
}

interface Crops {
  large: Complete[];
  thumbnail: Complete[];
}

interface Images {
  '16x9': string;
  '1x1': string;
  '3x2': string;
  '3x4': string;
  '4x3': string;
  '9x16': string;
}

interface OriginalInfo {
  width: number;
  height: number;
  extension: string;
  url: string;
}

interface RatioValue {
  cropHeight: number;
  cropWidth: number;
  x: number;
  y: number;
}

interface ByLine {
  plain: string;
}

interface Dates {
  displayPublished: Date;
  displayUpdated?: Date;
  published: Date;
  updated: Date;
}

interface Externalembed {
  url: string;
}

interface ImageDetail {
  binaryKey: string;
  complete: Complete[];
  crops: Crops;
  images: Images;
  notChildFriendly: boolean;
  originalInfo: OriginalInfo;
  ratios: { [key: string]: RatioValue };
}

interface TitleAlt {
  lg: string;
  md: string;
  sm: string;
}

interface ContextSettings {
  'meta.data.name'?: OdysseyContextSettings;
  odyssey?: OdysseyContextSettings;
}

interface OdysseyContextSettings {
  'replacement-title'?: string;
  theme?: string;
  alts?: {
    width?: string;
    image?: {
      id?: string;
    };
  }[];
  [key: string]: any;
}
