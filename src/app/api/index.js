import Block from '../components/Block';
import Caption from '../components/Caption';
import Gallery from '../components/Gallery';
import Picture from '../components/Picture';
import Quote from '../components/Quote';
import ShareLinks from '../components/ShareLinks';
import Sizer from '../components/Sizer';
import VideoPlayer from '../components/VideoPlayer';
import YouTubePlayer from '../components/YouTubePlayer';
import * as meta from '../meta';
import * as scheduler from '../scheduler';
import * as behaviour from '../utils/behaviour';
import * as content from '../utils/content';
import * as dom from '../utils/dom';
import * as logging from '../utils/logging';
import * as misc from '../utils/misc';
import * as mounts from '../utils/mounts';

export default {
  components: {
    Block,
    Caption,
    Gallery,
    Picture,
    Quote,
    ShareLinks,
    Sizer,
    VideoPlayer,
    YouTubePlayer
  },
  meta,
  scheduler,
  utils: {
    anchors: mounts,
    behaviour,
    content,
    dom,
    logging,
    misc,
    mounts
  }
};
