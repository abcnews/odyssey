# Odyssey

Enhance feature-worthy stories.

Odyssey is quite tightly coupled to ABC News environments and as such is generally unsuitable for use as a framework or library in other projects. However it's published here in the hope others might be able to learn from the techniques used or pull out small parts for use in their own projects.

## API

You can make use of the API in your stories to initialise custom sections/markers, use internal utlities and create your own components.

A reference to the API will exist on the global `window.__ODYSSEY__` property, after the article has been enhanced. Because your own code may run before the API exists, you should first check for its existence, and if it doesn't, you can listen for an `'odyssey:api'`event on the `window` object, which will fire once after the API exists. For convenience, the event's `detail` property is also a reference to the API. Here's an example of how you could do your own `thing` with the API:

```js
function thing(api) {
  // Do the thing
}

if (window.__ODYSSEY__) {
  thing(window.__ODYSSEY__);
} else {
  window.addEventListener('odyssey:api', e => {
    thing(e.detail);
  });
}
```

A brief tour of the API is included below, but please read the source to get a better picture of what's available, what arguments the functions take, and the expected effects of using them.

### `api.components.*`

Directly create components (`Block`|`Caption`|`Gallery`|`Picture`|`Quote`|`ShareLinks`|`VideoPlayer`), or use their transform functions on existing elements.

### `api.meta.getMeta`

Access the article's metadata (used internally to create Header components including the story's byline, publication dates, etc.)

### `api.scheduler.*`

Subscribed functions (`.subscribe()`) will be called with the viewport's dimensions every time the visitor scrolls or resizes the browser window. Enqueued functions (`.enqueue()`)will be called either in the current animation frame or a subsequent one, optimising for shorter frames.

### `api.utils.mounts.*`

Place `#mount` tags in Core Media articles to define your own sections/markers, then correctly parse them (.`getSections()`|`getMarkers()`) for use with your own components/transforms.

### `api.utils.dom.*`

Use the internal DOM inspection/manipulation functions as an alternative to other global libraries (such as jQuery)

### `api.utils.misc.*`

Use other internal utility functions for string mainpulation, event handling, element proximity, etc.

## Using Odyssey as a dependency

Odyssey is well modularised and parts of it can readily be used as dependencies for other projects. An important caveat to this is that Webpack does not automatically transpile es6 code in the `node_modules` folder (for sensible reasons).

Adding an `aunty.config.js` to your project with the following properties should do the trick.

```
const path = require('path');
module.exports = {
  babel: {
    cacheDirectory: false
  },
  webpack: config => {
    config.module.rules.find(x => x.__hint__ === 'scripts')
      .include.push(path.resolve(__dirname, 'node_modules/odyssey'));
    return config;
  }
};
```

## Developing

After checking out this repo, you'll need to copy `.env.example` to `.env` and populate it (ask one of the authors for values to use).

Odyssey also uses some internal ABC libraries, so you'll need to login following the [instructions](https://pl.abc-dev.net.au/docs/getting-started/aws/aws-login) in the PL documentation.

## Authors

- Joshua Byrd ([Byrd.Joshua@abc.net.au](mailto:Byrd.Joshua@abc.net.au))
- Simon Elvery ([Elvery.Simon@abc.net.au](mailto:Elvery.Simon@abc.net.au))
- Julian Fell ([Fell.Julian@abc.net.au](Fell.Julian@abc.net.au))"
- Ash Kyd ([Kyd.Ashley>@abc.net.au](Kyd.Ashley>@abc.net.au))"
- Colin Gourlay
- Nathan Hoad
