// @ts-check
import { detach } from '../../utils/dom';

/**
 *
 * @param {import('../../utils/mounts').Marker} marker
 */
export const transformMarker = marker => {
  const el = marker.node.nextElementSibling;
  el?.classList.add('u-cta');
  detach(marker.node);
};
