import html from 'bel';
import { url2cmid } from '@abcnews/url2cmid';
import { track } from '../../utils/behaviour';
import { MOCK_ELEMENT } from '../../../constants';
import { $, $$, getChildImage, substitute } from '../../utils/dom';
import './index.scss';

const StoryTeaserEmbed = ({ title, description, url, imageURL }) => {
  const id = url2cmid(url);

  return html`
    <aside class="StoryTeaserEmbed">
      <a href="${url}" onclick="${id ? () => track('recirculation-link', id) : null}">
        <h2>${title}</h2>
        <img src="${imageURL}" />
        <p>${description}</p>
      </a>
    </aside>
  `;
};

export default StoryTeaserEmbed;

export const doesElMatchConvention = el => el.getAttribute('data-component') === 'RelatedCard';

export const transformElement = el => {
  const title = $('h2,h3', el).textContent;
  const url = $('a', el).getAttribute('href');
  let imageURL = (getChildImage(el) || MOCK_ELEMENT).getAttribute('src');

  if (!title || !url || !imageURL) {
    return;
  }

  const pullRightWrapperEl = html`<div class="u-pull-right"></div>`;

  substitute(el, pullRightWrapperEl);
  pullRightWrapperEl.appendChild(el);
  imageURL = imageURL.replace(/[“”]/g, '');
  $$('noscript', el).forEach(noscriptEl => noscriptEl.parentElement.removeChild(noscriptEl));

  const description = (el.textContent || '')
    .replace(title, '')
    .replace('Read more', '')
    .replace(/\.{1}(\S)/g, '. $1')
    .trim();

  substitute(el, StoryTeaserEmbed({ title, url, imageURL, description }));
};
