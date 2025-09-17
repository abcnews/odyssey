// @ts-check
import html from 'nanohtml';
import { proximityCheck } from '../../utils/misc';
import { $ } from '../../utils/dom';
import { getMeta } from '../../meta';
import { subscribe, unsubscribe } from '../../scheduler';
import Icon from '../Icon';
import styles from './index.lazy.scss';

const SurveyCTA = ({ url }) => {
  styles.use();

  return html`<div class="SurveyCTA">
    <div class="Panel">
      <label>${Icon('feedback')} Feedback</label>
      <div>Help us improve — Tell us about your experience with this rich visual article</div>
      <a href="${url}">Take survey ${Icon('pencil')}</a>
    </div>
  </div> `;
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
