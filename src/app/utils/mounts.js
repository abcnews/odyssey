// @ts-check
import { isMount, selectMounts, getMountValue } from '@abcnews/mount-utils';
import { MOCK_ELEMENT } from '../constants';
import { detach, detachAll, substitute } from './dom';
import { debug } from './logging';

/**
 * @typedef {object} Section
 * @prop {string} name
 * @prop {string} configString,
 * @prop {Node} startNode
 * @prop {Node[]} betweenNodes,
 * @prop {Node} endNode
 * @prop {Node} [substitutionNode]
 * @prop {typeof _substituteSectionWith} [substituteWith]
 */

/**
 * @typedef {object} Marker
 * @prop {string} name,
 * @prop {string} configString,
 * @prop {Element} node
 * @prop {(replacementNode: Node) => Node | undefined} [substituteWith]
 */

/**
 * Grabs a #config mount point preceding `el` (if it exists) and returns its trailing value.
 * @param {Element} el Element for which to get config, if it exists
 * @returns {string} A config string
 */
export const grabPrecedingConfigString = el => {
  const prevEl = el.previousElementSibling || MOCK_ELEMENT;

  if (!isMount(prevEl, 'config')) {
    return '';
  }

  detach(prevEl);

  return getMountValue(prevEl, 'config');
};

/**
 *
 * @param {Element} el An element to replace the section with
 * @param {Node[]} remainingBetweenNodes
 * @this {Section}
 * @returns
 */
function _substituteSectionWith(el, remainingBetweenNodes) {
  remainingBetweenNodes = Array.isArray(remainingBetweenNodes) ? remainingBetweenNodes : this.betweenNodes;

  detachAll(remainingBetweenNodes.concat([this.endNode]));

  this.substitutionNode = el;

  return substitute(this.startNode, el);
}

/**
 * Get the sections in the document
 * @param {string|string[]} names
 * @returns {Section[]}
 */
export const getSections = names => {
  if (typeof names === 'string') {
    names = [names];
  }

  const sections = [];

  names.forEach(name => {
    const endName = `end${name}`;

    selectMounts(name).forEach(startNode => {
      /** @type {Node | null} */
      let nextNode = startNode;
      let isMoreContent = true;
      let hasEncountredUnexpectedStartMount = false;
      const betweenNodes = [];
      const configString = getMountValue(startNode, name);

      while (isMoreContent && (nextNode = nextNode.nextSibling) !== null) {
        if (isMount(nextNode, endName, true)) {
          isMoreContent = false;
        } else {
          if (isMount(nextNode, name)) {
            hasEncountredUnexpectedStartMount = true;
          }

          betweenNodes.push(nextNode);
        }
      }

      if (nextNode === null) {
        debug('No section closing mount found. Excluding section', {
          name,
          configString,
          startNode,
          betweenNodes
        });
        return;
      }

      /** @type {Section} */
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

/**
 *
 * @param {string|string[]} names
 * @returns
 */
export const getMarkers = names => {
  if (typeof names === 'string') {
    names = [names];
  }

  /** @type {Marker[]} */
  const initMarkersMemo = [];

  return names.reduce((memo, name) => {
    return memo.concat(
      selectMounts(name).map(node => {
        const configString = getMountValue(node, name);

        /** @type {Marker} */
        const marker = {
          name,
          configString,
          node
        };

        marker.substituteWith = substitute.bind(null, marker.node);

        return marker;
      })
    );
  }, initMarkersMemo);
};
