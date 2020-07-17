module.exports.components = {
  Block: require('../components/Block'),
  Caption: require('../components/Caption'),
  Gallery: require('../components/Gallery'),
  Picture: require('../components/Picture'),
  Quote: require('../components/Quote'),
  ShareLinks: require('../components/ShareLinks'),
  Sizer: require('../components/Sizer'),
  VideoPlayer: require('../components/VideoPlayer'),
  YouTubePlayer: require('../components/YouTubePlayer')
};
module.exports.meta = require('../meta');
module.exports.scheduler = require('../scheduler');
const mounts = require('../utils/mounts');
module.exports.utils = {
  anchors: mounts,
  behaviour: require('../utils/behaviour'),
  content: require('../utils/content'),
  dom: require('../utils/dom'),
  misc: require('../utils/misc'),
  mounts
};
