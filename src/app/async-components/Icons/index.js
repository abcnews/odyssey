const React = require('react');

module.exports = () => (
  <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
    <symbol viewBox="0 0 24 24" id="dls-icon-arrow-right">
      <title>arrow-right</title>
      <g fill="none" fillRule="evenodd">
        <path d="M0 0h24v24H0z" />
        <path
          fill="currentColor"
          d="M14.608 5.62l-1.09 1.09 4.531 4.53-15.031.002L3 12.796l15.1-.003-4.526 4.527 1.06 1.06L21 12.013z"
        />
      </g>
    </symbol>
    <symbol viewBox="0 0 24 24" id="dls-icon-close">
      <title>close</title>
      <g fill="none" fillRule="evenodd">
        <path d="M0 0h24v24H0z" />
        <path
          d="M3 4.5L4.5 3l7.5 7.5L19.5 3 21 4.5 13.5 12l7.5 7.5-1.5 1.5-7.5-7.5L4.5 21 3 19.5l7.5-7.5L3 4.5z"
          fill="currentColor"
        />
      </g>
    </symbol>
    <symbol viewBox="0 0 24 24" id="dls-icon-hamburger">
      <title>hamburger</title>
      <g fill="none" fillRule="evenodd">
        <path d="M0 0h24v24H0z" />
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" fillRule="nonzero" />
      </g>
    </symbol>
    <symbol viewBox="0 0 24 24" id="dls-icon-search">
      <title>search</title>
      <g fill="none" fillRule="evenodd">
        <path d="M0 0h24v24H0z" />
        <path
          d="M9.19 14.295a5.111 5.111 0 0 1-5.106-5.106 5.111 5.111 0 0 1 5.105-5.105 5.111 5.111 0 0 1 5.106 5.105 5.111 5.111 0 0 1-5.106 5.106zm5.125-1.01a6.535 6.535 0 0 0 1.439-4.096 6.564 6.564 0 1 0-13.129 0 6.564 6.564 0 0 0 6.564 6.565c1.55 0 2.972-.54 4.095-1.439l7.06 7.06 1.031-1.031-7.06-7.06z"
          fill="currentColor"
        />
      </g>
    </symbol>
  </svg>
);

module.exports.displayName = 'Icons';
