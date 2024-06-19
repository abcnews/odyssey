import html from 'nanohtml';

const Icon = (id) => {
  if (id === 'copylink') {
    id = 'link';
  }

  const { path, stroke, strokeWidth, fill } = ICONS[id];

  const paths = Array.isArray(path) ? path : [path];
  return html`
    <svg class="Icon" fill="${fill || ''}" width="1em" height="1em" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      ${paths.map(p => html`
        <path
          stroke="${stroke || 'none'}"
          stroke-width="${strokeWidth || 1}"
          d="${p}"
        />
      `)}
    </svg>
  `;
};

export default Icon;

const ICONS = {
  email: {
    path: '',
  },
  facebook: {
    path: 'M9.668 21h3.335v-8.996h2.502L16 9.194h-2.997V7.157c0-.759.309-1.346 1.26-1.346h1.494V3h-2.088c-3.24.013-4 1.99-3.995 3.937l-.006 2.257H8v2.81h1.668V21Z',
  },
  native: {
    path: '',
  },
  linkedin: {
    path: 'M16.529 8.677c3.774 0 4.471 2.49 4.471 5.73V21h-3.727v-5.847c0-1.395-.027-3.188-1.939-3.188-1.94 0-2.236 1.519-2.236 3.086V21H9.372V8.977h3.574v1.641h.052c.498-.944 1.716-1.94 3.53-1.94Zm-9.498.3V21H3.296V8.977h3.735ZM5.164 3a2.165 2.165 0 0 1 0 4.332A2.164 2.164 0 0 1 3 5.165C3 3.97 3.967 3 5.164 3Z',
  },
  twitter: {
    path: 'M13.317 10.775 19.146 4h-1.381l-5.061 5.883L8.662 4H4l6.112 8.896L4 20h1.381l5.344-6.212L14.994 20h4.662l-6.339-9.225ZM5.88 5.04H8l9.765 13.968h-2.121L5.879 5.04Z',
  },
  tick: {
    path: 'M20 6 8 18l-5-5',
    fill: 'none',
    strokeWidth: 2,
    stroke: "currentColor",
  },
  link: {
    path: [
      "M11.119 14.069s-.48-.33-.694-.544c-1.367-1.367-1.404-3.546-.082-4.868l2.992-2.992c1.321-1.321 3.5-1.285 4.868.082 1.367 1.367 1.403 3.546.081 4.868l-1.555 1.556",
      "M12.559 10.153c.247.149.48.33.694.544 1.367 1.367 1.403 3.546.082 4.868l-2.992 2.992c-1.322 1.321-3.501 1.285-4.868-.082-1.367-1.367-1.404-3.547-.082-4.868L6.95 12.05"
    ],
    fill: 'none',
    strokeWidth: 2,
    stroke: "currentColor",
  },
  cross: {
    path: [
      "M19 19 5 5",
      "M5 19 19 5"
    ],
    strokeWidth: 2,
    stroke: "currentColor",
  },
  share: {
    path: 'M15 13s-9-1-12.998 7c0 0 0-13 12.998-13V3l7 7-7 7v-4Z',
    fill: "currentColor",
  },
};
