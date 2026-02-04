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

To simulate Odyssey loading in development:

```html
<script>
  window.dispatchEvent(new CustomEvent('odyssey:api'));
</script>
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

### Visual regression testing

There are some e2e tests designed to be run against the live production output from Presentation Layer. These can be
used to test for visual regressions **while developing** and may also be useful for diagnosing
**issues related to changes in Presentation Layer** that have affected Odyssey.

There are GitHub workflows that run tests for any pull requests to `main`. There is also a workflow for updating the
'expected' snapshots tests are compared against.

Playwright visual tests [are not cross-OS
compatible](https://www.tonyward.dev/articles/visual-regression-testing-disruption), so running tests locally will not
produce snapshots usable in the CI environment. Therefore the source of truth must always be
the CI output. It's the responsibility of the developer making the PR to check, approve and update the 'expected'
snapshots for visual changes.

When a PR for merging back to `main` is created, the workflow will run. If visual regression tests fail, the workflow
will post a comment on the PR with a link to the test report.

Once you have checked the test report and are happy with the visual changes, add a comment to the PR with the text
`/approve-snapshots`. This will kick off the snapshot update workflow which will commit the new source of truth
snapshots back to the PR branch when it's done.

> [!NOTE]
> Haley Ward [describes the problem and this solution well](https://medium.com/@haleywardo/streamlining-playwright-visual-regression-testing-with-github-actions-e077fd33c27c).

#### Running visual tests locally

Although the source of truth is controlled by the CI, it can still be useful to run tests locally during development.

However, ultimately visual changes should to be approved in a PR using the workflows.

To do this effectively, you'll need to take a couple of steps:

1. Run `npx playwright test --update-snapshots` with `main` checked out
2. Run `npm run test` (or `npx playwright test`) against your dev branch to test for visual changes.

There is a `.gitignore` rule in place for snapshot files generated on MacOS to avoid accidentally committing them to the
repository.

#### Running visual tests locally with `act`

It's also possible to run the GitHub workflows locally using [`act`](https://nektosact.com/introduction.html). To run
the tests and check for visual changes, simply run `act` from the root of the repository.

This will spin up Docker containers and run the tests in an environment that mimics the GitHub workflows environment. It
will create a Playwright report in `.artifacts/1/playwright-report/`.

In theory, this can produce snapshots that will be usable by the CI. To run the update-snapshots workflow call `act
workflow_dispatch`. This will generate new snapshots and copy them to `.artifacts/1/snapshots/snapshots.zip`.

To make snapshots generated this way into the expected versions, you'll need to extract them from the zip file and move them to `e2e/visual.spec.js-snapshots`.

## Authors

- Joshua Byrd ([Byrd.Joshua@abc.net.au](mailto:Byrd.Joshua@abc.net.au))
- Simon Elvery ([Elvery.Simon@abc.net.au](mailto:Elvery.Simon@abc.net.au))
- Julian Fell ([Fell.Julian@abc.net.au](Fell.Julian@abc.net.au))"
- Ash Kyd ([Kyd.Ashley>@abc.net.au](Kyd.Ashley>@abc.net.au))"
- Colin Gourlay
- Nathan Hoad
