/**
 * comparator.js — Side-by-Side Display Comparator
 *
 * Manages the two-panel comparator section.
 * Panel A is always synced from the main calculator (read-only here).
 * Panel B has its own independent inputs (but shares the scaling factor).
 */

import { computePPI, computePPD, computeVFI, getTier, getTierColor } from './formula.js';
import { state } from './state.js';

// ---------------------------------------------------------------------------
// Module-level score cache — avoids fragile DOM-text reading in _updateVerdict
// ---------------------------------------------------------------------------

const _scores = { A: NaN, B: NaN };

// ---------------------------------------------------------------------------
// Panel A — updated by calculator.js on every calculate() call
// ---------------------------------------------------------------------------

/**
 * Sync Panel A with the current main calculator result.
 * Called from calculator.js after each calculation.
 *
 * @param {number} vfi   — Current VFI score
 * @param {object} tier  — Tier descriptor from getTier()
 * @param {number} ppdH  — Horizontal PPD
 * @param {number} ppi   — Physical PPI
 */
export function updateComparatorA(vfi, tier, ppdH, ppi) {
    _scores.A = vfi;
    _setPanel('A', vfi, tier, ppdH, ppi);
    _updateVerdict();
}

// ---------------------------------------------------------------------------
// Panel B — independent inputs, self-contained calculation
// ---------------------------------------------------------------------------

/** Recalculate and update Panel B from its own input fields. */
export function calcComparatorB() {
    const w    = parseFloat(document.getElementById('cw').value);
    const h    = parseFloat(document.getElementById('ch').value);
    const size = parseFloat(document.getElementById('cs').value);
    const dist = parseFloat(document.getElementById('cd').value);

    if (!w || !h || !size || !dist || w < 1 || h < 1 || size < 1 || dist < 1) return;

    // Apply the same scaling factor as the main calculator
    const sc   = state.scale;
    const ppi  = computePPI(w, h, size);
    const effPPI = ppi / sc;
    const ppd  = computePPD(dist, effPPI);
    const vfi  = computeVFI(ppd);
    const tier = getTier(vfi);

    _scores.B = vfi;
    _setPanel('B', vfi, tier, ppd, ppi);
    _updateVerdict();
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function _setPanel(id, vfi, tier, ppd, ppi) {
    const suffix = id; // 'A' or 'B'
    document.getElementById(`compScore${suffix}`).textContent = Math.round(vfi);
    document.getElementById(`compTier${suffix}`).textContent  = tier.name;

    const bar = document.getElementById(`compBar${suffix}`);
    bar.style.width      = `${Math.min(vfi / 150 * 100, 100)}%`;
    bar.style.background = getTierColor(tier.cls);

    document.getElementById(`compPPD${suffix}`).textContent = `${Math.round(ppd)} PPD`;
    document.getElementById(`compPPI${suffix}`).textContent = `${Math.round(ppi)} PPI`;
}

function _updateVerdict() {
    const aScore = _scores.A;
    const bScore = _scores.B;
    const verdict = document.getElementById('compVerdict');

    if (isNaN(aScore) || isNaN(bScore)) return;

    const diff   = Math.abs(aScore - bScore);
    const winner = aScore > bScore ? 'A' : bScore > aScore ? 'B' : null;

    if (!winner) {
        verdict.textContent = 'Both displays are perceptually identical at these settings.';
    } else {
        const nameA = document.getElementById('compNameA').textContent || 'Display A';
        const nameB = document.getElementById('compNameB')?.value || 'Display B';
        const winnerName = winner === 'A' ? nameA : nameB;
        const loserName  = winner === 'A' ? nameB : nameA;
        const significance =
            diff < 5  ? 'practically identical (below perceptual threshold)' :
            diff < 15 ? 'marginally sharper' :
            diff < 30 ? 'noticeably sharper' : 'significantly sharper';

        verdict.textContent =
            `${winnerName} is ${significance} than ${loserName} at your viewing distances (Δ${Math.round(diff)} VFI).`;
    }
    verdict.classList.add('has-result');
}
