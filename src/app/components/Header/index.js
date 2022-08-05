import { getMountValue, isMount } from '@abcnews/mount-utils';
import cn from 'classnames';
import html from 'nanohtml';
import { VIDEO_MARKER_PATTERN } from '../../constants';
import { enqueue, subscribe } from '../../scheduler';
import { terminusFetch } from '../../utils/content';
import { $, detach, detectVideoId, getChildImage, isElement } from '../../utils/dom';
import { clampNumber, formattedDate, getRatios } from '../../utils/misc';
import Picture from '../Picture';
import ScrollHint from '../ScrollHint';
import { activate as activateUParallax } from '../UParallax';
import VideoPlayer from '../VideoPlayer';
import YouTubePlayer from '../YouTubePlayer';
import styles from './index.lazy.scss';

const Header = ({
  imgEl,
  isAbreast,
  isDark,
  isFloating,
  isKicker,
  isLayered,
  isPale,
  isVideoYouTube,
  meta = {},
  miscContentEls = [],
  ratios = {},
  shouldVideoPlayOnce,
  videoId
}) => {
  isFloating = isFloating || (isLayered && !imgEl && !videoId);
  isLayered = isLayered || isFloating;
  isDark = isLayered || typeof isDark === 'boolean' ? isDark : meta.isDarkMode;
  isAbreast = !isFloating && !isLayered && (imgEl || videoId) && isAbreast;

  const className = cn(
    'Header',
    {
      'is-abreast': isAbreast,
      'is-dark': isDark,
      'is-pale': isPale,
      'is-floating': isFloating,
      'is-layered': isLayered
    },
    'u-full'
  );

  ratios = {
    sm: ratios.sm || (isLayered ? '3x4' : '1x1'),
    md: ratios.md || (isLayered ? '1x1' : '3x2'),
    lg: isAbreast ? '3x4' : ratios.lg,
    xl: isAbreast ? '1x1' : ratios.xl
  };

  let mediaEl;

  if (imgEl) {
    mediaEl = Picture({
      src: imgEl.src,
      alt: imgEl.getAttribute('alt'),
      ratios,
      shouldLazyLoad: false
    });
  } else if (videoId) {
    mediaEl = isVideoYouTube
      ? YouTubePlayer({
          videoId,
          isLoop: shouldVideoPlayOnce ? false : undefined,
          isAmbient: true,
          ratios
        })
      : VideoPlayer({
          videoId,
          ratios,
          isLoop: shouldVideoPlayOnce ? false : undefined,
          isInvariablyAmbient: true
        });
  }

  if (mediaEl && !isLayered && !isAbreast) {
    mediaEl.classList.add('u-parallax');
    activateUParallax(mediaEl);
  }

  const titleEl = html`
    <h1>
      ${isKicker && meta.title.indexOf(': ') > -1
        ? meta.title.split(': ').map((text, index) => (index === 0 ? html`<small>${text}</small>` : text))
        : meta.title}
    </h1>
  `;

  const clonedMiscContentEls = miscContentEls.map(el => {
    const clonedEl = el.cloneNode(true);

    clonedEl.classList.add('Header-miscEl');

    return clonedEl;
  });

  const clonedBylineNodes = meta.bylineNodes ? meta.bylineNodes.map(node => node.cloneNode(true)) : null;
  const infoSourceEl = meta.infoSource
    ? html`
        <p class="Header-infoSource">
          ${meta.infoSource.url
            ? html`<a href="${meta.infoSource.url}">${meta.infoSource.name}</a>`
            : meta.infoSource.name}
        </p>
      `
    : null;
  const [published, updated] = [meta.published, meta.updated].map(date =>
    date
      ? {
          datetime: date.toISOString(),
          text: formattedDate(date)
        }
      : null
  );

  const contentEls = [titleEl]
    .concat(clonedMiscContentEls)
    .concat([
      clonedBylineNodes ? html`<p class="Header-byline">${clonedBylineNodes}</p>` : null,
      infoSourceEl,
      updated
        ? html`<div class="Header-updated">Updated <time datetime="${updated.datetime}">${updated.text}</time></div>`
        : null,
      published
        ? html`
            <div class="Header-published">
              Published <time datetime="${published.datetime}">${published.text}</time>
            </div>
          `
        : null
    ]);

  const headerContentEl = html`<div class="Header-content u-richtext${isDark ? '-invert' : ''}">${contentEls}</div>`;

  const headerEl = html`
    <div class="${className}">
      ${mediaEl
        ? html`
            <div class="Header-media${isLayered && !isAbreast && mediaEl.tagName !== 'DIV' ? ' u-parallax' : ''}">
              ${!isLayered && !isAbreast ? ScrollHint() : null} ${mediaEl}
            </div>
          `
        : null}
      ${headerContentEl}
    </div>
  `;

  fetchInfoSourceLogo(meta, infoSourceEl, isLayered ? 'layered' : isDark ? 'dark' : 'light');

  if (!isLayered && !isAbreast) {
    subscribe(function _updateContentPeek() {
      updateContentPeek(headerEl);
    });
  }

  styles.use();

  return headerEl;
};

export default Header;

export const Lite = meta => {
  return Header({ meta, imgEl: meta.relatedMedia && getChildImage(meta.relatedMedia.cloneNode(true)) });
};

function updateContentPeek(headerEl) {
  let titleHeight = 0;
  let titleBottomMargin = 0;
  const titleEl = $('h1', headerEl);

  if (titleEl) {
    titleHeight = titleEl.getBoundingClientRect().height;
    titleBottomMargin = +window.getComputedStyle(titleEl).marginBottom.replace('px', '');
  }

  enqueue(function _updateContentPeekCustomProp() {
    headerEl.style.setProperty('--Header-contentPeek', Math.round(titleHeight + titleBottomMargin) + 'px');
  });
}

function fetchInfoSourceLogo(meta, el, variant) {
  if (!meta.infoSourceLogosHTMLFragmentId || !el) {
    return;
  }

  terminusFetch({ id: meta.infoSourceLogosHTMLFragmentId, type: 'htmlfragment' }, (err, item) => {
    if (err) {
      return;
    }

    const logoDocs = item.contextSettings['meta.data.name'];
    const logoDoc = logoDocs[`${meta.infoSource.name} (${variant})`] || logoDocs[meta.infoSource.name];

    if (logoDoc) {
      terminusFetch({ id: logoDoc.id, type: logoDoc.docType.toLowerCase() }, (err, item) => {
        const image = item.media.image.primary.complete[0];
        const imageRatio = image.height / image.width;

        el.className = `${el.className} has-logo`;
        // Height based on the image ratio (wider is shorter), clamped between 48px and 64px
        el.style.height = `${clampNumber(Math.round(64 * imageRatio), 48, 64)}px`;
        el.style.backgroundImage = `url(${image.url})`;
      });
    }
  });
}

export const transformSection = (section, meta) => {
  const ratios = getRatios(section.configString);
  const isFloating = section.configString.indexOf('floating') > -1;
  const isLayered = isFloating || section.configString.indexOf('layered') > -1;
  const isDark =
    isLayered || section.configString.indexOf('dark') > -1
      ? true
      : section.configString.indexOf('light') > -1
      ? false
      : null;
  const isPale = section.configString.indexOf('pale') > -1;
  const isAbreast = section.configString.indexOf('abreast') > -1;
  const isNoMedia = isFloating || section.configString.indexOf('nomedia') > -1;
  const isKicker = section.configString.indexOf('kicker') > -1;
  const shouldSupplant = section.configString.indexOf('supplant') > -1;
  const shouldVideoPlayOnce = section.configString.indexOf('once') > -1;

  let candidateNodes = section.betweenNodes;

  if (!isNoMedia && meta.relatedMedia != null) {
    candidateNodes = [meta.relatedMedia.cloneNode(true)].concat(candidateNodes);
  }

  if (shouldSupplant && candidateNodes.length) {
    detach(candidateNodes.shift());
  }

  const config = candidateNodes.reduce(
    (config, node) => {
      const mountValue = isMount(node) ? getMountValue(node) : '';
      const isVideoMarker = !!mountValue.match(VIDEO_MARKER_PATTERN);
      let videoId;
      let imgEl;

      if (!isNoMedia && !config.videoId && !config.imgEl && isElement(node)) {
        if (isVideoMarker) {
          config.isVideoYouTube = !!mountValue.split('youtube')[1];
          config.videoId = videoId = mountValue.match(VIDEO_MARKER_PATTERN)[1];
        } else {
          videoId = detectVideoId(node);

          if (videoId) {
            config.videoId = videoId;
          } else {
            imgEl = getChildImage(node);

            if (imgEl) {
              config.imgEl = imgEl;
            }
          }
        }
      }

      if (!videoId && !imgEl && isElement(node) && ((node.textContent || '').trim().length > 0 || !!mountValue)) {
        config.miscContentEls.push(node);
      }

      return config;
    },
    {
      meta,
      ratios,
      isAbreast,
      isDark,
      isPale,
      isFloating,
      isLayered,
      isKicker,
      miscContentEls: [],
      shouldVideoPlayOnce
    }
  );

  section.substituteWith(Header(config));
};
