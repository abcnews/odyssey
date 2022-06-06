// External
const { GlobalSearchLink } = require('@abcaustralia/global-components/es6/GlobalSearchLink/GlobalSearchLink');
const { BrandLogo } = require('@abcaustralia/nucleus/es6/BrandLogo/BrandLogo');
const { MastheadBox } = require('@abcaustralia/nucleus/es6/MastheadBox/MastheadBox');
const { MastheadLogoLink } = require('@abcaustralia/nucleus/es6/MastheadLogoLink/MastheadLogoLink');
const React = require('react');

// Ours
require('./index.scss');

module.exports = () => (
  <MastheadBox contentAnchor="#content" className="Nav" data-component="Masthead">
    <div className="Nav-row">
      <MastheadLogoLink className="Nav-logoLink" linkHref={`${window.location.origin}/news/`}>
        <BrandLogo logoType="news" screenReaderText="ABC News Homepage" />
      </MastheadLogoLink>
      <div className="Nav-actions">
        <GlobalSearchLink
          className="Nav-searchLink"
          searchURL="https://search-beta.abc.net.au/index.html?siteTitle=news"
        />
      </div>
    </div>
  </MastheadBox>
);
