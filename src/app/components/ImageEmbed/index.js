import cn from 'classnames';
import html from 'nanohtml';
import { ALIGNMENT_PATTERN, EMBED_ALIGNMENT_MAP } from '../../constants';
import { lookupImageByAssetURL } from '../../meta';
import { getChildImage, substitute } from '../../utils/dom';
import { getRatios } from '../../utils/misc';
import { grabPrecedingConfigString } from '../../utils/mounts';
import { createFromTerminusDoc as createCaptionFromTerminusDoc } from '../Caption';
import Picture from '../Picture';
import styles from './index.lazy.scss';

const ImageEmbed = ({ pictureEl, captionEl, alignment, isFull, isCover, isAnon }) => {
  if (isCover) {
    isFull = true;
    isAnon = true;
  }

  const className = cn('ImageEmbed', {
    [`u-pull-${alignment}`]: !isFull && alignment,
    'u-pull': !isFull && !alignment,
    'u-full': isFull,
    'is-cover': isCover
  });

  styles.use();

  return html`<div class="${className}">${pictureEl} ${isAnon ? null : captionEl}</div>`;
};

export default ImageEmbed;

export const transformElement = el => {
  const imgEl = getChildImage(el);

  if (!imgEl) {
    return;
  }

  const src = imgEl.src;
  const imageDoc = lookupImageByAssetURL(src);

  if (!imageDoc || imageDoc.media.image.primary.complete.length < 2) {
    // Custom Images appear to be Images in Terminus V2. We should ignore them (for now).
    // TODO: A custom image embed solution. Captionless with custom aspect ratio? #config for max-width?
    return;
  }

  const configString = grabPrecedingConfigString(el);
  const descriptorAlignment = el._descriptor ? EMBED_ALIGNMENT_MAP[el._descriptor.props.align] : undefined;
  const [, alignment] = configString.match(ALIGNMENT_PATTERN) || [, descriptorAlignment];
  const ratios = getRatios(configString);
  const isStatic = configString.indexOf('static') > -1;
  const unlink = configString.indexOf('unlink') > -1;
  const alt = imgEl.getAttribute('alt');

  const imageEmbedEl = ImageEmbed({
    pictureEl: Picture({
      src,
      alt,
      ratios: {
        sm: ratios.sm || '3x4',
        md: ratios.md || '4x3',
        lg: ratios.lg,
        xl: ratios.xl
      },
      linkUrl: `/news/${imageDoc.id}`,
      shouldLazyLoad: !isStatic
    }),
    captionEl: createCaptionFromTerminusDoc(imageDoc, unlink),
    alignment,
    isFull: configString.indexOf('full') > -1,
    isCover: configString.indexOf('cover') > -1,
    isAnon: configString.indexOf('anon') > -1
  });

  substitute(el, imageEmbedEl);
};
