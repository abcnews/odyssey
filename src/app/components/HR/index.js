import { conditionallyApply as conditionallyApplyUDropcap } from '../UDropcap';

const HR = () => {
  const el = document.createElement('hr');

  return el;
};

export default HR;

export const transformMarker = marker => {
  const el = HR();

  marker.substituteWith(el);
  conditionallyApplyUDropcap(el.nextElementSibling);
};
