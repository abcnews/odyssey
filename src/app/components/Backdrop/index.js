//@ts-check
import cn from 'classnames';
import html from 'nanohtml';
import styles from './index.lazy.scss';

const Backdrop = ({ bgColor = 'rgb(255, 255, 255)', isDark = false, contentEls = [] }) => {
  styles.use();

  return html`
    <div class="Backdrop u-full" style="background-color: ${bgColor}">
      <div
        class="${cn('u-layout', {
          'u-richtext': !isDark,
          'u-richtext-invert': isDark
        })}"
      >
        ${contentEls}
      </div>
    </div>
  `;
};

export default Backdrop;

const HEX3_PATTERN = /^([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
const HEX6_PATTERN = /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;

export const transformSection = section => {
  let [, hr, hg, hb] = section.configString.match(HEX6_PATTERN) || [];

  if (!hr) {
    [, hr, hg, hb] = section.configString.match(HEX3_PATTERN) || [, 'f', 'f', 'f'];
  }

  if (hr.length === 1) {
    [hr, hg, hb] = [`${hr}${hr}`, `${hg}${hg}`, `${hb}${hb}`];
  }

  const rgb = {
    r: parseInt(hr, 16),
    g: parseInt(hg, 16),
    b: parseInt(hb, 16)
  };

  // Formula: tinycolor.js' getBrightness https://bgrins.github.io/TinyColor/docs/tinycolor.html
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;

  section.substituteWith(
    Backdrop({
      bgColor: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
      isDark: brightness < 128,
      contentEls: section.betweenNodes
    }),
    []
  );
};
