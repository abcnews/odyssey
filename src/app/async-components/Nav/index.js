// External
const Masthead = require('@abcaustralia/abc-components/cjs/Masthead/Masthead').default;
const Navigation = require('@abcaustralia/abc-components/cjs/Navigation/Navigation').default;
const React = require('react');

// Ours
require('./index.scss');

const DOMAIN = window.location.origin;

const GLOBAL_NAV = [
  {
    linkTo: 'https://www.abc.net.au/news',
    linkText: 'News',
    active: true
  },
  {
    linkTo: 'https://www.abc.net.au/life/ ',
    linkText: 'Life'
  },
  {
    linkTo: 'http://radio.abc.net.au/',
    linkText: 'Radio'
  },
  {
    linkTo: 'https://iview.abc.net.au',
    linkText: 'iview'
  }
];

const NAVIGATION_DATA = [
  {
    path: '/news/',
    title: 'NEWS',
    root: true
  }
];

module.exports = ({ name }) => (
  <Masthead primaryHeading="News" navigation={NAVIGATION_DATA} globalNav={GLOBAL_NAV} domain={DOMAIN}>
    {name}
    <Navigation domain={DOMAIN} navigation={NAVIGATION_DATA} />
  </Masthead>
);
