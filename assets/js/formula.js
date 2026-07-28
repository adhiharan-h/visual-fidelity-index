/**
 * formula.js — VFI Core Mathematics
 *
 * All physics and scoring functions are pure (no DOM access).
 * This makes them trivially testable and reusable outside the browser.
 *
 * Formula derivation:
 *   Human visual acuity limit ≈ 60 cycles per degree (CPD) under optimal
 *   conditions (20/20 vision, high contrast, good lighting).
 *
 *   PPD (Pixels Per Degree) measures how many pixels subtend one degree
 *   of visual angle at a given distance. When PPD ≥ 60, individual pixels
 *   are below the angular resolution threshold of human vision.
 *
 *   VFI normalises PPD to 60 so that VFI 100 = exactly at the acuity limit.
 *
 * References:
 *   - Visual acuity: ISO 9241-303, Merrill (1957)
 *   - Angular resolution formula: standard optics / display engineering
 */

/** Half a degree expressed in radians — the core angular constant. */
export const TAN_HALF_DEG = Math.tan(0.5 * Math.PI / 180);

/** Human visual acuity limit in cycles per degree (the VFI 100 reference point). */
export const RETINA_PPD = 60;

/**
 * Typical viewing distance uncertainty used for confidence interval calculation.
 * Most users vary their distance by roughly ±3 inches during normal use.
 */
export const DIST_UNCERTAINTY_IN = 3;

/** SVG ring circumference for a circle with r=85 (used to animate the score ring). */
export const RING_CIRCUMFERENCE = 2 * Math.PI * 85;

// ---------------------------------------------------------------------------
// Core formula functions
// ---------------------------------------------------------------------------

/**
 * Compute physical pixel density (PPI) from resolution and screen size.
 * @param {number} w    — Horizontal resolution (pixels)
 * @param {number} h    — Vertical resolution (pixels)
 * @param {number} size — Diagonal screen size (inches)
 * @returns {number} PPI
 */
export function computePPI(w, h, size) {
    return Math.sqrt(w * w + h * h) / size;
}

/**
 * Compute Pixels Per Degree (PPD) — the angular resolution metric.
 * @param {number} dist — Viewing distance (inches)
 * @param {number} ppi  — Effective pixel density (PPI after scaling)
 * @returns {number} PPD
 */
export function computePPD(dist, ppi) {
    return 2 * dist * ppi * TAN_HALF_DEG;
}

/**
 * Normalise PPD to the VFI score (0–100 maps to 0–60 PPD; >100 is possible).
 * @param {number} ppd
 * @returns {number} VFI score
 */
export function computeVFI(ppd) {
    return (ppd / RETINA_PPD) * 100;
}

/**
 * Compute the ±VFI confidence band from viewing distance uncertainty.
 * Propagates σ_dist through the PPD formula using the partial derivative.
 * @param {number} ppi — Effective PPI
 * @returns {number} Half-width of the confidence band (± this value)
 */
export function computeConfidence(ppi) {
    const sigmaPPD = 2 * DIST_UNCERTAINTY_IN * ppi * TAN_HALF_DEG;
    return (sigmaPPD / RETINA_PPD) * 100;
}

/**
 * Solve the PPD formula for distance: find the minimum distance at which
 * the display reaches the target PPD (default: Retina threshold of 60 PPD).
 * @param {number} ppi       — Effective PPI
 * @param {number} targetPPD — Target PPD (default: RETINA_PPD)
 * @returns {number} Distance in inches
 */
export function computeOptimalDist(ppi, targetPPD = RETINA_PPD) {
    return targetPPD / (2 * ppi * TAN_HALF_DEG);
}

/**
 * Compute separate horizontal and vertical PPI values.
 * Useful for ultrawide monitors or non-square pixel displays.
 * @param {number} w    — Horizontal resolution
 * @param {number} h    — Vertical resolution
 * @param {number} size — Diagonal size (inches)
 * @returns {{ ppiH: number, ppiV: number }}
 */
export function computePPIHV(w, h, size) {
    const aspect = Math.atan2(h, w);
    return {
        ppiH: w / (size * Math.cos(aspect)),
        ppiV: h / (size * Math.sin(aspect)),
    };
}

// ---------------------------------------------------------------------------
// Tier classification
// ---------------------------------------------------------------------------

/**
 * Return a tier descriptor object for a given VFI score.
 * @param {number} vfi
 * @returns {{ name: string, cls: string, badge: string, msg: string }}
 */
export function getTier(vfi) {
    if (vfi < 33)  return { name: 'PIXELATED',    cls: 'theme-pixelated', badge: 'tier-pixelated', msg: 'Individual pixels are clearly visible. Not ideal for text-heavy work at this distance.' };
    if (vfi < 55)  return { name: 'LOW FIDELITY', cls: 'theme-low',       badge: 'tier-low',       msg: 'Visible pixel structure in text and fine detail. Consider sitting farther back or upgrading.' };
    if (vfi < 75)  return { name: 'STANDARD',      cls: 'theme-standard',  badge: 'tier-std',       msg: 'Acceptable for video and casual use. Text may appear slightly soft on close inspection.' };
    if (vfi < 100) return { name: 'HIGH FIDELITY', cls: 'theme-high',      badge: 'tier-std',       msg: 'Pixels are very hard to see at this distance. Excellent for all uses.' };
    if (vfi < 133) return { name: 'RETINA GRADE',  cls: 'theme-retina',    badge: 'tier-retina',    msg: 'Exceeds the average human acuity limit. Zero visible pixelation at this distance.' };
    return           { name: 'OVERKILL',           cls: 'theme-overkill',  badge: 'tier-over',      msg: 'Beyond the biological limit of human vision. Extra pixels provide no perceptual benefit.' };
}

/**
 * Map a tier CSS class name to its corresponding hex colour string.
 * Used by JS to set SVG stroke and bar colours.
 * @param {string} cls — tier class name e.g. 'theme-retina'
 * @returns {string} hex colour
 */
export function getTierColor(cls) {
    const map = {
        'theme-pixelated': '#ef4444',
        'theme-low':       '#f97316',
        'theme-standard':  '#eab308',
        'theme-high':      '#22c55e',
        'theme-retina':    '#6366f1',
        'theme-overkill':  '#a855f7',
    };
    return map[cls] ?? '#6366f1';
}
