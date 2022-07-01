import { detach } from '../../utils/dom';

export const transformMarker = marker => {
  const el = marker.node.nextElementSibling;

  el.classList.add('u-cta');
  detach(marker.node);
};
