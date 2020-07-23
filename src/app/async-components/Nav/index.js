// External
const GlobalNavigation = require('@abcaustralia/abc-components/es6/Globals/GlobalNavigation/GlobalNavigation').default;
const GlobalSearchLink = require('@abcaustralia/abc-components/es6/Globals/GlobalSearchLink/GlobalSearchLink').default;
const BrandLogo = require('@abcaustralia/nucleus/es6/BrandLogo/BrandLogo').default;
const MastheadBox = require('@abcaustralia/nucleus/es6/MastheadBox/MastheadBox').default;
const MastheadLogoLink = require('@abcaustralia/nucleus/es6/MastheadLogoLink/MastheadLogoLink').default;
const React = require('react');

// Ours
require('./index.scss');

const HOME_URL = `${window.location.origin}/news/`;

const GLOBAL_NAV = [
  {
    linkTo: 'https://www.abc.net.au/',
    linkText: 'ABC Home'
  },
  {
    linkTo: 'https://www.abc.net.au/news/',
    linkText: 'News',
    active: true
  },
  {
    linkTo: 'https://radio.abc.net.au/',
    linkText: 'Radio'
  },
  {
    linkTo: 'https://iview.abc.net.au',
    linkText: 'iview',
    linkLogo: 'iview'
  },
  {
    linkTo: 'https://www.abc.net.au/more/',
    linkText: 'More'
  }
];

module.exports = () => (
  <MastheadBox contentAnchor="#content" className="Nav" data-component="Masthead">
    <div className="Nav-row">
      <MastheadLogoLink className="Nav-logoLink" linkHref={HOME_URL}>
        <BrandLogo logoType="news" screenReaderText="ABC News Homepage" />
      </MastheadLogoLink>
      <div className="Nav-actions">
        <GlobalSearchLink
          className="Nav-searchLink"
          searchURL="https://search-beta.abc.net.au/index.html?siteTitle=news"
        />
        <GlobalNavigation buttonClassName="Nav-globalNavButton" navItems={GLOBAL_NAV} />
      </div>
    </div>
  </MastheadBox>
);
