// @ts-check
import { conditionallyApply as conditionallyApplyUDropcap } from '../UDropcap';

const HR = () => {
  const el = document.createElement('hr');

  return el;
};

export default HR;

/**
 *
 * @param {import('src/app/utils/mounts').Marker} marker
 * @param {Partial<import('src/app/meta').MetaData>} meta
 */
export const transformMarker = (marker, meta) => {
  const el = HR();

  marker.substituteWith && marker.substituteWith(el);
  conditionallyApplyUDropcap(el.nextElementSibling);
};
