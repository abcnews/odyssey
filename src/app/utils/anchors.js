// Ours
const { MOCK_ELEMENT } = require('../../constants');
const { $$, detach, detachAll, isElement, substitute } = require('./dom');

function grabConfigSC(el) {
  const prevEl = el.previousElementSibling || MOCK_ELEMENT;
  const prevElName = prevEl.getAttribute('name') || '';
  let configSC;

  // TODO: Convert #image and #video in all stories to #config
  ['config', 'image', 'video'].some(name => {
    if (prevElName.indexOf(name) === 0) {
      configSC = prevElName.slice(name.length);
      detach(prevEl);
    }
  });

  return configSC || '';
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

    $$(`a[name^="${name}"]`).forEach(startNode => {
      let nextNode = startNode;
      let isMoreContent = true;
      const betweenNodes = [];
      const configSC = startNode.getAttribute('name').slice(name.length);

      while (isMoreContent && (nextNode = nextNode.nextSibling) !== null) {
        if (isElement(nextNode) && (nextNode.getAttribute('name') || '').indexOf(endName) === 0) {
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
      $$(`a[name^="${name}"]`).map(node => {
        const configSC = node.getAttribute('name').slice(name.length);

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
  grabConfigSC,
  getSections,
  getMarkers
};
