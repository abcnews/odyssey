import { GlobalSearchLink } from '@abcaustralia/global-components/es6/GlobalSearchLink/GlobalSearchLink';
import { BrandLogo } from '@abcaustralia/nucleus/es6/BrandLogo/BrandLogo';
import { MastheadBox } from '@abcaustralia/nucleus/es6/MastheadBox/MastheadBox';
import { MastheadLogoLink } from '@abcaustralia/nucleus/es6/MastheadLogoLink/MastheadLogoLink';
import React from 'react';
import './index.scss';

const Nav = () => (
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

export default Nav;
