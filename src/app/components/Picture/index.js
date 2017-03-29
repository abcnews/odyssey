// External
const html = require('bel');

// Ours
const {MQ, SMALLEST_IMAGE} = require('../../../constants');

const SIZES = {
  '16x9': {sm: '700x394', md: '940x529', lg: '2150x1210'},
	'3x2': {sm: '700x467', md: '940x627', lg: '940x627'},
	'4x3': {sm: '700x525', md: '940x705', lg: '940x705'},
	'1x1': {sm: '700x700', md: '940x940', lg: '1400x1400'},
	'3x4': {sm: '700x933', md: '940x1253', lg: '940x1253'}
}

const RATIO_PATTERN = /(\d+x\d+)/;
const P1_RATIO_SIZE_PATTERN = /(\d+x\d+)-(\d+x\d+)/;
const P2_RATIO_SIZE_PATTERN = /(\d+x\d+)-([a-z]+)/;

module.exports = function Picture({
  src = SMALLEST_IMAGE,
  alt = '',
  smRatio = '1x1',
  mdRatio = '3x2',
  lgRatio = '16x9',
  preserveOriginalRatio = false
}) {
  const [, originalRatio] = src.match(RATIO_PATTERN) || [, null];

  if (preserveOriginalRatio && originalRatio) {
    smRatio = originalRatio;
    mdRatio = originalRatio;
    lgRatio = originalRatio;
  }

  const imageURL = src
    .replace(P2_RATIO_SIZE_PATTERN, '$1-large');
  const smImageURL = imageURL
    .replace(RATIO_PATTERN, smRatio)
    .replace(P1_RATIO_SIZE_PATTERN, `${smRatio}-${SIZES[smRatio].sm}`);
  const mdImageURL = imageURL
    .replace(RATIO_PATTERN, mdRatio)
    .replace(P1_RATIO_SIZE_PATTERN, `${mdRatio}-${SIZES[mdRatio].md}`);
  const lgImageURL = imageURL
    .replace(RATIO_PATTERN, lgRatio)
    .replace(P1_RATIO_SIZE_PATTERN, `${lgRatio}-${SIZES[lgRatio].lg}`);
  const lansdcapeImageURL = imageURL
    .replace(P1_RATIO_SIZE_PATTERN, `${lgRatio}-${SIZES[lgRatio].md}`);

  return html`
    <picture>
      <source srcset="${lgImageURL}" media="${MQ.LG}" />
      <source srcset="${lansdcapeImageURL}" media="${MQ.LANDSCAPE} and ${MQ.NOT_LG}" />
      <source srcset="${smImageURL}" media="${MQ.SM}" />
      <img srcset="${mdImageURL}" src=${mdImageURL} alt="${alt}" />
    </picture>
  `;
};
