module.exports.components = {
  Block: require('../components/Block'),
  Caption: require('../components/Caption'),
  Gallery: require('../components/Gallery'),
  Picture: require('../components/Picture'),
  Quote: require('../components/Quote'),
  ShareLinks: require('../components/ShareLinks'),
  VideoPlayer: require('../components/VideoPlayer'),
  YouTubePlayer: require('../components/YouTubePlayer')
};
module.exports.meta = require('../meta');
module.exports.scheduler = require('../scheduler');
module.exports.utils = {
  anchors: require('../utils/anchors'),
  behaviour: require('../utils/behaviour'),
  dom: require('../utils/dom'),
  misc: require('../utils/misc')
};
