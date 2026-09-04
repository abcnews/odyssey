// @ts-check

import { track } from './app/utils/behaviour';

// Tests for a variety of browser features to ensure Odyssey can successfully render.
export const unsupported = () => {
  const supportsLayers = supportsCascadeLayers();
  const supportsScope = supportsScopeRule();

  // Temporary: measure these things
  // TODO: Remove this
  track('css-layers-supported', String(supportsLayers));
  track('css-scope-supported', String(supportsScope));

  // Conditions that are unsupported
  if (
    // TODO: re-visit this once we have more statistics and have thought through other potential solutions.
    !supportsLayers ||
    !supportsScope ||
    isOldIE()
  ) {
    return true;
  }
  return false; // Default to the assumption that the browser is supported.
};

/**
 * Definitive test for @layer support.
 * See https://www.css-cascade-layers.com/browser-support-compatibility-migration/testing-cascade-layers-across-browsers/checking-layer-support-with-css-supports-in-javascript/
 * @returns {boolean}
 */
const supportsCascadeLayers = () => {
  if (typeof CSSStyleSheet === 'undefined') return false;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('@layer probe { }');
    if (sheet.cssRules.length === 0) return false;
    // WHY instanceof with a guard: constructor.name breaks under minifiers
    // that rename globals; the guard covers engines lacking the interface.
    return typeof CSSLayerBlockRule !== 'undefined' && sheet.cssRules[0] instanceof CSSLayerBlockRule;
  } catch {
    return false;
  }
};

/**
 * Test for @scope support
 * @returns {boolean}
 */
const supportsScopeRule = () => {
  if (typeof CSSStyleSheet === 'undefined') return false;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('@scope (.selector-1) to (.selector-2) { }');
    if (sheet.cssRules.length === 0) return false;
    return typeof CSSScopeRule !== 'undefined' && sheet.cssRules[0] instanceof CSSScopeRule;
  } catch {
    return false;
  }
};

/**
 * Is this an old (Trident-based) Microsoft browser we don't support?
 * @returns {boolean}
 */
const isOldIE = () => {
  // @ts-expect-error
  if (/* IE <= 9 */ (document.all && !window.atob) || /* IE >= 10 */ window.navigator.msPointerEnabled) {
    return true;
  }
  return false;
};
