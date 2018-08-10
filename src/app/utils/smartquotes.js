/*
smartquotes.js by Kelly Martin
https://github.com/kellym/smartquotesjs

Edits by Colin Gourlay:
* Make regexes constants
* Beginning double quotes can appear before periods and ellipses
* Only expose the `element` function
* Remove the UMD wrapper.

The MIT License (MIT)

Copyright (c) 2013 Kelly Martin

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const TO_TRIPLE_PRIME = /'''/g;
const TO_BEGINNING_DOUBLE_QUOTE = /(\W|^)"([\w\u2026\.\(\[])/g;
const TO_ENDING_DOUBLE_QUOTE = /(\u201c[^"]*)"([^"]*$|[^\u201c"]*\u201c)/g;
const TO_ENDING_DOUBLE_QUOTE_FROM_END_OF_WORD = /([^0-9])"/g;
const TO_DOUBLE_PRIME_FROM_TWO_SINGLE_QUOTES = /''/g;
const TO_BEGINNING_SINGLE_QUOTE = /(\W|^)'(\S)/g;
const TO_CONJUNCTIONS_POSSESSION = /([a-z])'([a-z])/gi;
const TO_ABBREVIATED_YEAR = /(\u2018)([0-9]{2}[^\u2019]*)(\u2018([^0-9]|$)|$|\u2019[a-z])/gi;
const TO_ENDING_SINGLE_QUOTE = /((\u2018[^']*)|[a-z])'([^0-9]|$)/gi;
const TO_BACKWARDS_APOSTROPHE = /(\B|^)\u2018(?=([^\u2018\u2019]*\u2019\b)*([^\u2018\u2019]*\B\W[\u2018\u2019]\b|[^\u2018\u2019]*$))/gi;
const TO_DOUBLE_PRIME = /"/g;
const TO_PRIME = /'/g;

function format(str, retainLength) {
  return str
    .replace(TO_TRIPLE_PRIME, '\u2034' + (retainLength ? '\u2063\u2063' : ''))
    .replace(TO_BEGINNING_DOUBLE_QUOTE, '$1\u201c$2')
    .replace(TO_ENDING_DOUBLE_QUOTE, '$1\u201d$2')
    .replace(TO_ENDING_DOUBLE_QUOTE_FROM_END_OF_WORD, '$1\u201d')
    .replace(TO_DOUBLE_PRIME_FROM_TWO_SINGLE_QUOTES, '\u2033' + (retainLength ? '\u2063' : ''))
    .replace(TO_BEGINNING_SINGLE_QUOTE, '$1\u2018$2')
    .replace(TO_CONJUNCTIONS_POSSESSION, '$1\u2019$2')
    .replace(TO_ABBREVIATED_YEAR, '\u2019$2$3')
    .replace(TO_ENDING_SINGLE_QUOTE, '$1\u2019$3')
    .replace(TO_BACKWARDS_APOSTROPHE, '$1\u2019')
    .replace(TO_DOUBLE_PRIME, '\u2033')
    .replace(TO_PRIME, '\u2032');
}

function smartquotes(root) {
  var TEXT_NODE = (typeof Element !== 'undefined' && Element.TEXT_NODE) || 3;

  handleElement(root);

  function handleElement(el) {
    if (['CODE', 'PRE', 'SCRIPT', 'STYLE'].indexOf(el.nodeName.toUpperCase()) !== -1) {
      return;
    }

    var i, node, nodeInfo;
    var childNodes = el.childNodes;
    var textNodes = [];
    var text = '';

    // compile all text first so we handle working around child nodes
    for (i = 0; i < childNodes.length; i++) {
      node = childNodes[i];

      if (node.nodeType === TEXT_NODE || node.nodeName === '#text') {
        textNodes.push([node, text.length]);
        text += node.nodeValue || node.value;
      } else if (node.childNodes && node.childNodes.length) {
        text += handleElement(node);
      }
    }
    text = format(text, true);
    for (i in textNodes) {
      nodeInfo = textNodes[i];
      if (nodeInfo[0].nodeValue) {
        nodeInfo[0].nodeValue = substring(text, nodeInfo[0].nodeValue, nodeInfo[1]);
      } else if (nodeInfo[0].value) {
        nodeInfo[0].value = substring(text, nodeInfo[0].value, nodeInfo[1]);
      }
    }
    return text;
  }

  function substring(text, value, position) {
    return text.substr(position, value.length).replace('\u2063', '');
  }

  return root;
}

module.exports = smartquotes;
