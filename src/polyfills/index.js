// ECMAScript
import 'core-js/stable/array/fill';
import 'core-js/stable/dom-collections/iterator';
import 'core-js/stable/object/entries';
import 'core-js/stable/set/index';
import 'core-js/stable/string/starts-with';
import 'core-js/stable/symbol';
import 'core-js/stable/symbol/iterator';
// Browser APIs
import 'custom-event-polyfill';
import 'ric';
// CSS
import 'objectFitPolyfill';

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
