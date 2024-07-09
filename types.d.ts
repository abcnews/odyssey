declare module '*.lazy.scss';

interface Window {
  __NEXT_DATA__: any; // TODO: define this type
  YT: any; // The YouTube iframe player API
  onYouTubeIframeAPIReady: () => void;
  FB: any; // The Facebook embed API
  twttr: any; // The twitter embed API
  instgrm: any; // The instagram embed API
}

interface TerminusArticle {
  _embedded: TerminusArticleEmbedded;
  _links: TerminusArticleLinks;
  canonicalURI: string;
  canonicalURL: string;
  contentSource: string;
  contextSettings: ContextSettings;
  dates: Dates;
  docType: string;
  embeddedMedia: EmbeddedMedia[];
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
  synopsisAlt: SynopsisAlt;
  text: Text;
  title: string;
  titleAlt: MediaEmbeddedTitleAlt;
  version: number;
}

interface TerminusArticleEmbedded {
  contributors: Contributor[];
  javascript: Javascript[];
  locations: Location[];
  mediaEmbedded: MediaEmbedded[];
  mediaFeatured: MediaEmbedded[];
  mediaRelated: MediaEmbedded[];
  mediaThumbnail: MediaThumbnail;
  primaryContext: PrimaryContext;
  subjects: Subject[];
}

interface Contributor {
  _links: ContributorLinks;
  canonicalURI: string;
  canonicalURL: string;
  id: string;
  names: Names;
  role: string;
}

interface ContributorLinks {
  search: Self;
  self: Self;
}

interface Self {
  href: string;
}

interface Names {
  first: string;
  full: string;
  last: string;
}

interface Javascript {
  _links: JavascriptLinks;
  contentSource: string;
  docType: string;
  id: string;
  lang: string;
  url: string;
}

interface JavascriptLinks {
  self: Self;
}

interface Location {
  _links: ContributorLinks;
  canonicalURI: string;
  canonicalURL: string;
  id: string;
  latitude: string;
  longitude: string;
  parent?: Location;
  title: string;
}

interface MediaEmbedded {
  _links: JavascriptLinks;
  target: {
    id: string;
    docType: string;
  };
  alt?: string;
  byLine?: ByLine;
  canonicalURI?: string;
  canonicalURL?: string;
  caption?: string;
  contentSource: string;
  dates: Dates;
  docType: string;
  id: string;
  lang: string;
  media?: Media;
  title?: string;
  titleAlt?: MediaEmbeddedTitleAlt;
  _embedded?: MediaEmbeddedEmbedded;
  synopsis?: string;
  synopsisAlt?: SynopsisAlt;
  externalembed?: Externalembed;
  teaserText?: TeaserText;
  viewType?: string;
  contactable?: boolean;
}

interface MediaEmbeddedEmbedded {
  mediaThumbnail: MediaThumbnail;
}

interface MediaThumbnail {
  _links: JavascriptLinks;
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

interface Complete {
  cropHeight: number;
  cropWidth: number;
  height: number;
  ratio: RatioEnum;
  url: string;
  width: number;
  x: number;
  y: number;
}

enum RatioEnum {
  The16X9 = '16x9',
  The1X1 = '1x1',
  The3X2 = '3x2',
  The3X4 = '3x4',
  The4X3 = '4x3',
  The9X16 = '9x16'
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
  json: ByLineJSON;
  plain: string;
}

interface ByLineJSON {
  type: Type;
  tagname: string;
  parameters: JSONParameters;
  children: PurpleChild[];
}

interface PurpleChild {
  type: Type;
  tagname: Tagname;
  children: FluffyChild[];
}

interface FluffyChild {
  type: Type;
  content?: string;
  tagname?: string;
  parameters?: PurpleParameters;
  children?: TentacledChild[];
}

interface TentacledChild {
  type: Type;
  content: string;
}

enum Type {
  Element = 'element',
  Text = 'text'
}

interface PurpleParameters {
  ref: string;
  show: string;
}

enum Tagname {
  A = 'a',
  H1 = 'h1',
  P = 'p',
  Pullquote = 'pullquote',
  UL = 'ul'
}

interface JSONParameters {
  xmlns: string;
  'xmlns:xlink'?: string;
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

interface Media {
  image: Image;
}

interface Image {
  primary: Primary;
}

interface Primary {
  binaryKey: string;
  complete: Complete[];
  crops: Crops;
  images: Images;
  notChildFriendly: boolean;
  originalInfo: OriginalInfo;
  ratios: { [key: string]: RatioValue };
}

interface SynopsisAlt {
  lg: string;
  sm: string;
}

interface TeaserText {
  json: TeaserTextJSON;
  plain: string;
}

interface TeaserTextJSON {
  type: Type;
  tagname: string;
  parameters: JSONParameters;
  children: StickyChild[];
}

interface StickyChild {
  type: Type;
  tagname: Tagname;
  children?: IndigoChild[];
}

interface IndigoChild {
  type: Type;
  content?: string;
  tagname?: string;
  children?: TentacledChild[];
  parameters?: FluffyParameters;
}

interface FluffyParameters {
  href: string;
  show: string;
}

interface MediaEmbeddedTitleAlt {
  lg: string;
  md: string;
  sm: string;
}

interface PrimaryContext {
  _links: JavascriptLinks;
  canonicalURI: string;
  canonicalURL: string;
  contentSource: string;
  docType: string;
  id: string;
  lang: string;
  title: string;
  titleAlt: PrimaryContextTitleAlt;
  viewType: string;
}

interface PrimaryContextTitleAlt {
  lg: string;
}

interface Subject {
  _links: ContributorLinks;
  canonicalURI: string;
  canonicalURL: string;
  id: string;
  parent?: Subject;
  title: string;
}

interface TerminusArticleLinks {
  self: Self;
  'terminus:teasable': Self;
}

interface ContextSettings {
  'amp.enabled': boolean;
  'bundle.itunes.email': string;
  'channel.description': string;
  'image.post.policy': string;
  'meta.data.name': MetaDataName;
}

interface MetaDataName {
  'replacement-title': string;
  theme: string;
}

interface EmbeddedMedia {
  docType: string;
  id: string;
}

interface Site {
  segment: string;
  title: string;
}

interface Text {
  estimatedWordCount: number;
  json: TextJSON;
  plain: string;
}

interface TextJSON {
  type: Type;
  tagname: string;
  parameters: JSONParameters;
  children: IndecentChild[];
}

interface IndecentChild {
  type: Type;
  tagname: Tagname;
  children: HilariousChild[];
  parameters?: StickyParameters;
}

interface HilariousChild {
  type: Type;
  content?: string;
  tagname?: string;
  children?: FluffyChild[];
  parameters?: TentacledParameters;
}

interface TentacledParameters {
  href?: string;
  show: string;
  ref?: string;
}

interface StickyParameters {
  align: string;
  ref: string;
}

// Converts JSON strings to/from your types
class Convert {
  public static toTerminusArticle(json: string): TerminusArticle {
    return JSON.parse(json);
  }

  public static terminusArticleToJson(value: TerminusArticle): string {
    return JSON.stringify(value);
  }
}
