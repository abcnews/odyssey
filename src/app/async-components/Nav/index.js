// External
const Masthead = require('@abcaustralia/abc-components/es6/Masthead/Masthead').default;
const React = require('react');

// Ours
require('./index.scss');

const DOMAIN = window.location.origin;

const GLOBAL_NAV = [
  {
    linkTo: 'https://www.abc.net.au/news/',
    linkText: 'News',
    active: true
  },
  {
    linkTo: 'https://www.abc.net.au/life/ ',
    linkText: 'Life'
  },
  {
    linkTo: 'https://radio.abc.net.au/',
    linkText: 'Radio'
  },
  {
    linkTo: 'https://iview.abc.net.au/',
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

module.exports = () => <Masthead domain={DOMAIN} globalNav={GLOBAL_NAV} navigation={NAVIGATION_DATA} />;
