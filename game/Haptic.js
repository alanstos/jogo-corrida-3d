/**
 * Haptic feedback utility — cross-browser guard for the Web Vibration API.
 *
 * iOS Safari has never supported navigator.vibrate.
 * Firefox 129+ (released 2024) removed the Vibration API entirely.
 * Do NOT simplify the guard to `if (navigator.vibrate)` — that is a truthy
 * check and would still throw a TypeError on browsers where the property is
 * undefined, or pass incorrectly if the property exists but returns false.
 * The precise `typeof === 'function'` check is the only safe form.
 */

/**
 * Trigger a vibration pattern on devices that support the Web Vibration API.
 * Silently no-ops on iOS, Firefox 129+, and any other unsupported environment.
 *
 * @param {number | number[]} pattern - Duration in ms (e.g. 50) or alternating
 *   vibrate/pause array (e.g. [100, 30, 100]). Canonical call form: [50] or [100].
 */
export function vibrate(pattern) {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}
