# Odyssey

Enhance feature-worthy stories.

## API

You can make use of the API in your stories to initialise custom sections/markers, use internal utlities and create your own components.

A reference to the API will exist on the global `window.__ODYSSEY__` property, after the article has been enhanced. Because your own code may run before the API exists, you should first check for its existence, and if it doesn't, you can listenen for an `'odyssey:api'`event on the `window` object, which will fire once after the API exists. For convenience, the event's `detail` property is also a reference to the API. Here's an example of how you could do your own `thing` with the API:

``` js
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

### `api.utils.anchors.*`
 
Place `#anchor` tags in Core Media articles to define your own sections/markers, then correctly parse them (.`getSections()`|`getMarkers()`) for use with your own components/transforms.

### `api.utils.dom.*`
 
Use the internal DOM inspection/manipulation functions as an alternative to other global libraries (such as jQuery)

### `api.utils.misc.*`
 
Use other internal utility functions for string mainpulation, event handling, element proximity, etc.


## Authors

- Simon Elvery ([Elvery.Simon@abc.net.au](mailto:Elvery.Simon@abc.net.au))
- Colin Gourlay ([Gourlay.Colin@abc.net.au](mailto:Gourlay.Colin@abc.net.au))
- Nathan Hoad ([Hoad.Nathan@abc.net.au](mailto:Hoad.Nathan@abc.net.au))
