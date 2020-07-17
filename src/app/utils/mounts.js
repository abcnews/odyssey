// Ours
const { MOCK_ELEMENT } = require('../../constants');
const { $$, detach, detachAll, isElement, substitute } = require('./dom');

const MOUNT_JOINABLE_SELECTOR = ['[data-mount][id', '],a[id', ']:not([href]),a[name', ']:not([href])'];
const MOUNT_SELECTOR = MOUNT_JOINABLE_SELECTOR.join('');
const CONFIG_MOUNT_NAME = 'config';

const prefixedMountSelectorCache = {};

function prefixedMountSelector(prefix) {
  if (!prefixedMountSelectorCache[prefix]) {
    prefixedMountSelectorCache[prefix] = MOUNT_JOINABLE_SELECTOR.join(`^="${prefix}"`);
  }

  return prefixedMountSelectorCache[prefix];
}

function isMount(el) {
  return isElement(el) && el.matches(MOUNT_SELECTOR);
}

function isPrefixedMount(el, prefix) {
  return isElement(el) && el.matches(prefixedMountSelector(prefix));
}

// SC -> "Scriptio continua" https://en.wikipedia.org/wiki/Scriptio_continua
function getMountSC(el) {
  return el.getAttribute('id') || el.getAttribute('name') || '';
}

function getTrailingMountSC(el, prefix) {
  return getMountSC(el).slice(prefix.length);
}

function grabConfigSC(el) {
  const prevEl = el.previousElementSibling || MOCK_ELEMENT;

  if (!isPrefixedMount(prevEl, CONFIG_MOUNT_NAME)) {
    return '';
  }

  detach(prevEl);

  return getTrailingMountSC(prevEl, CONFIG_MOUNT_NAME);
}

function _substituteSectionWith(el, remainingBetweenNodes) {
  remainingBetweenNodes = Array.isArray(remainingBetweenNodes) ? remainingBetweenNodes : this.betweenNodes;

  detachAll(remainingBetweenNodes.concat([this.endNode]));

  return substitute(this.startNode, el);
}

function getSections(names) {
  if (typeof names === 'string') {
    names = [names];
  }

  const sections = [];

  names.forEach(name => {
    const endName = `end${name}`;

    $$(prefixedMountSelector(name)).forEach(startNode => {
      let nextNode = startNode;
      let isMoreContent = true;
      const betweenNodes = [];
      const configSC = getTrailingMountSC(startNode, name);

      while (isMoreContent && (nextNode = nextNode.nextSibling) !== null) {
        if (isPrefixedMount(nextNode, endName)) {
          isMoreContent = false;
        } else {
          betweenNodes.push(nextNode);
        }
      }

      const section = {
        name,
        configSC,
        startNode,
        betweenNodes,
        endNode: nextNode
      };

      section.substituteWith = _substituteSectionWith.bind(section);
      sections.push(section);
    });
  });

  return sections;
}

function getMarkers(names) {
  if (typeof names === 'string') {
    names = [names];
  }

  return names.reduce((memo, name) => {
    return memo.concat(
      $$(prefixedMountSelector(name)).map(node => {
        const configSC = getTrailingMountSC(node, name);

        const marker = {
          name,
          configSC,
          node
        };

        marker.substituteWith = substitute.bind(null, marker.node);

        return marker;
      })
    );
  }, []);
}

module.exports = {
  prefixedMountSelector,
  isMount,
  isPrefixedMount,
  getMountSC,
  getTrailingMountSC,
  grabConfigSC,
  getSections,
  getMarkers
};
