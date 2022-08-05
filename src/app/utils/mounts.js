import { getTrailingMountValue, isExactMount, isPrefixedMount, prefixedMountSelector } from '@abcnews/mount-utils';
import { MOCK_ELEMENT } from '../constants';
import { $$, detach, detachAll, substitute } from './dom';
import { debug } from './logging';

// Grabs a #config mount point preceding `el` (if it exists) and returns its trailing value.
export const grabPrecedingConfigString = el => {
  const prevEl = el.previousElementSibling || MOCK_ELEMENT;

  if (!isPrefixedMount(prevEl, 'config')) {
    return '';
  }

  detach(prevEl);

  return getTrailingMountValue(prevEl, 'config');
};

function _substituteSectionWith(el, remainingBetweenNodes) {
  remainingBetweenNodes = Array.isArray(remainingBetweenNodes) ? remainingBetweenNodes : this.betweenNodes;

  detachAll(remainingBetweenNodes.concat([this.endNode]));

  this.substitutionNode = el;

  return substitute(this.startNode, el);
}

export const getSections = names => {
  if (typeof names === 'string') {
    names = [names];
  }

  const sections = [];

  names.forEach(name => {
    const endName = `end${name}`;

    $$(prefixedMountSelector(name)).forEach(startNode => {
      let nextNode = startNode;
      let isMoreContent = true;
      let hasEncountredUnexpectedStartMount = false;
      const betweenNodes = [];
      const configString = getTrailingMountValue(startNode, name);

      while (isMoreContent && (nextNode = nextNode.nextSibling) !== null) {
        if (isExactMount(nextNode, endName)) {
          isMoreContent = false;
        } else {
          if (isPrefixedMount(nextNode, name)) {
            hasEncountredUnexpectedStartMount = true;
          }

          betweenNodes.push(nextNode);
        }
      }

      const section = {
        name,
        configString,
        startNode,
        betweenNodes,
        endNode: nextNode
      };

      if (isMoreContent) {
        debug('No section closing mount found. Excluding section', section);
        return;
      }

      if (hasEncountredUnexpectedStartMount) {
        debug('Encountered unexpected section opener during discovery. Excluding section', section);
        return;
      }

      section.substituteWith = _substituteSectionWith.bind(section);
      sections.push(section);
    });
  });

  return sections;
};

export const getMarkers = names => {
  if (typeof names === 'string') {
    names = [names];
  }

  return names.reduce((memo, name) => {
    return memo.concat(
      $$(prefixedMountSelector(name)).map(node => {
        const configString = getTrailingMountValue(node, name);

        const marker = {
          name,
          configString,
          node
        };

        marker.substituteWith = substitute.bind(null, marker.node);

        return marker;
      })
    );
  }, []);
};
