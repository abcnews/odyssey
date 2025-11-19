// @ts-check
import html from 'nanohtml';
import { proximityCheck } from '../../utils/misc';
import { $ } from '../../utils/dom';
import { getMeta } from '../../meta';
import { subscribe, unsubscribe } from '../../scheduler';
import Icon from '../Icon';
import styles from './index.lazy.scss';

let uniqueId = Math.round(Math.random() * 1e6);

const SurveyCTA = ({ url }) => {
  styles.use();
  let id = uniqueId++;

  return html`<aside class="SurveyCTA" aria-labelledby="odyssey-surveycta-${id}">
    <div class="Panel">
      <div id="odyssey-surveycta-${id}" class="SurveyCTA__label" role="heading" aria-level="2">
        ${Icon('feedback', true)} Feedback
      </div>
      <div class="SurveyCTA__text">Help us improve — Tell us about your experience with this rich visual article</div>
      <a href="${url}">Take survey ${Icon('pencil', true)}</a>
    </div>
  </aside>`;
};

export default SurveyCTA;

/**
 *
 * @param {import('src/app/utils/mounts').Marker} marker The marker to transform
 * @param {string} url The URL to use for the survey link
 */
export const transformMarker = (marker, url) => {
  marker.substituteWith?.(SurveyCTA({ url }));
};
