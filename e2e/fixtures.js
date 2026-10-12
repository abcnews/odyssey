/**
 * @type {[number, number][]}
 */
export const RESOLUTIONS = [
  [1920, 1080],
  [390, 844]
];

/**
 * The outputs to test with as an array of [subdomain, path_prefix]
 * @type {[string, string][]}
 */
export const PLATFORMS = [
  ['www', 'news'],
  ['newsapp', 'newsapp']
];

/**
 * List of articles and elements to do visual tests on
 * @type {{cmid: string; targets: {selector: string; tags?: string[]}[]}[]}
 */
export const ARTICLES = [
  {
    cmid: '105234668', // Finding Robert Bogucki, the man who disappeared on purpose
    targets: [
      { selector: '.Block', tags: ['Block', 'Caption'] },
      { selector: '.Header.is-layered', tags: ['Header'] }
    ]
  },
  {
    cmid: '106260980',
    targets: [{ selector: '.Header.is-dark', tags: ['Header'] }]
  },
  {
    cmid: '105888546',
    targets: [{ selector: '.Header-content', tags: ['Header'] }] // no media
  },
  {
    cmid: '106004326', // When the southern lights are seen further north
    targets: [{ selector: '.Block:has(.Block-mediaCaption)', tags: ['Block', 'Caption'] }]
  },
  {
    cmid: '106196216',
    targets: [
      { selector: '.Mosaic', tags: ['Mosaic'] },
      { selector: '.Quote.is-pullquote', tags: ['Quote'] }
    ]
  },
  {
    cmid: '7355810',
    targets: [
      { selector: '.ImageEmbed + .Quote.is-pullquote', tags: ['Quote'] }, // Quote with attribution
      { selector: '.Mosaic-item .Quote.is-pullquote', tags: ['Quote'] } // Quote in a Mosaic component
    ]
  },
  {
    cmid: '105866280', // The ocean’s ‘wall of death’
    targets: [{ selector: '.Gallery', tags: ['Gallery'] }]
  },
  {
    cmid: '102321436',
    targets: [
      { selector: '.Backdrop', tags: ['Backdrop'] },
      { selector: '.FormatCredit', tags: ['FormatCredit'] }
    ]
  },
  // {
  //   cmid: '105906708',
  //   targets: [
  //     { selector: '.Header', tags: ['Header'] } // supplant
  //   ]
  // },
  {
    cmid: '105996614',
    targets: [{ selector: '.Mosaic.u-full', tags: ['Mosaic'] }]
  },
  {
    cmid: '105412700',
    targets: [
      { selector: '.Block.has-light', tags: ['Block'] },
      { selector: '.ShareBar', tags: ['Share'] }
    ]
  },
  {
    cmid: '106097868',
    targets: [{ selector: '.Main > hr', tags: ['HR'] }]
  },
  {
    cmid: '105637506',
    targets: [{ selector: '.ImageEmbed.is-cover', tags: ['Config'] }]
  },
  {
    cmid: '105957172',
    targets: [
      { selector: '.u-pull-in', tags: ['pull-in'] },
      { selector: '.u-quote', tags: ['Smart Quotes'] }
    ]
  },
  {
    cmid: '104573748',
    targets: [
      { selector: '.u-cta', tags: ['CTA'] },
      { selector: '[data-component="Iframe"]', tags: ['Datawrapper', 'iframe'] }
    ]
  },
  {
    cmid: '105884760',
    targets: [
      { selector: '[data-component="LegacyWysiwyg"]', tags: ['wysiwyg teaser'] },
      { selector: '[data-component="LegacyWysiwyg"].u-pull-right', tags: ['wysiwyg teaser'] }
    ]
  },
  {
    cmid: '102963260',
    targets: [
      { selector: '.InteractiveEmbed[data-provider="instagram"]', tags: ['Interactive', 'Instagram', 'iframe'] },
      { selector: '.InteractiveEmbed[data-provider="singleTweet"]', tags: ['Interactive', 'Twitter', 'iframe'] }
    ]
  }
];

export const EMBED_CONTENT_ELEMENTS = {
  Instagram: '.EmbedVideo video',
  Twitter: 'article',
  Datawrapper: '#chart'
};
