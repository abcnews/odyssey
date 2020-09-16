// ECMAScript
require('core-js/stable/array/fill');
require('core-js/stable/dom-collections/iterator');
require('core-js/stable/object/entries');
require('core-js/stable/string/starts-with');
require('core-js/stable/symbol');
require('core-js/stable/symbol/iterator');
// Browser APIs
require('custom-event-polyfill');
require('ric');
// CSS
require('objectFitPolyfill');

if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

if (!Element.prototype.closest) {
  Element.prototype.closest = function (s) {
    var el = this;

    do {
      if (el.matches(s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}
