/**
 * comparator.js — Side-by-Side Display Comparator
 *
 * Manages the two-panel comparator section.
 * Panel A is always synced from the main calculator (read-only here).
 * Panel B has its own independent inputs (but shares the scaling factor).
 */

import { computePPI, computePPD, computeEffectivePPD, computeVFI, computePPIHV, getTier, getTierColor } from './formula.js';
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
 * @param {string} [name] — Name of Display A
 */
export function updateComparatorA(vfi, tier, ppdH, ppi, name) {
    _scores.A = vfi;
    if (name) {
        const nameEl = document.getElementById('compNameA');
        if (nameEl) nameEl.textContent = name;
    }
    _setPanel('A', vfi, tier, ppdH, ppi);
    updateVerdict();
}

// ---------------------------------------------------------------------------
// Panel B — independent inputs, self-contained calculation
// ---------------------------------------------------------------------------

/** Recalculate and update Panel B from its own input fields. */
export function calcComparatorB() {
    const w       = parseFloat(document.getElementById('cw').value);
    const h       = parseFloat(document.getElementById('ch').value);
    const rawSize = parseFloat(document.getElementById('cs').value);
    const rawDist = parseFloat(document.getElementById('cd').value);

    const isMetric = state.unit === 'cm';
    const size = rawSize; // Screen size is ALWAYS in standard inches
    const dist = isMetric ? (rawDist / 2.54) : rawDist;

    if (!w || !h || !size || !dist || w < 1 || h < 1 || size < 0.5 || dist < 0.5) {
        _scores.B = NaN;
        const scoreEl = document.getElementById('compScoreB');
        if (scoreEl) {
            scoreEl.textContent = '—';
            scoreEl.style.color = '';
            scoreEl.style.textShadow = '';
        }
        const tierEl = document.getElementById('compTierB');
        if (tierEl) {
            tierEl.textContent = '—';
            tierEl.className = 'comp-tier';
        }
        const bar = document.getElementById('compBarB');
        if (bar) {
            bar.style.setProperty('--bar-pct', 0);
            bar.style.background = '';
            bar.style.boxShadow = '';
        }
        const ppdEl = document.getElementById('compPPDB');
        if (ppdEl) ppdEl.textContent = '— PPD';
        const ppiEl = document.getElementById('compPPIB');
        if (ppiEl) ppiEl.textContent = '— PPI';
        const verdict = document.getElementById('compVerdict');
        if (verdict) {
            verdict.textContent = 'Enter valid display specifications for Display B.';
            verdict.classList.remove('has-result');
        }
        return;
    }

    // Apply the same scaling factor as the main calculator
    const sc   = state.scale;
    const ppi  = computePPI(w, h, size);
    const { ppiH, ppiV } = computePPIHV(w, h, size);
    const activePPD = computeEffectivePPD(dist, ppi, ppiH, ppiV, state.useCase, sc);
    const vfi  = computeVFI(activePPD);
    const tier = getTier(vfi);

    _scores.B = vfi;
    _setPanel('B', vfi, tier, activePPD, ppi);
    updateVerdict();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function _setPanel(id, vfi, tier, ppd, ppi) {
    const suffix = id; // 'A' or 'B'
    const color = getTierColor(tier.cls);
    const scoreEl = document.getElementById(`compScore${suffix}`);
    if (scoreEl) {
        scoreEl.textContent = Math.round(vfi);
        scoreEl.style.color = color;
        scoreEl.style.textShadow = 'none';
    }
    const tierEl = document.getElementById(`compTier${suffix}`);
    if (tierEl) {
        tierEl.textContent = tier.name;
        tierEl.className = `comp-tier tier-badge ${tier.badge}`;
    }

    const bar = document.getElementById(`compBar${suffix}`);
    if (bar) {
        bar.style.setProperty('--bar-pct', Math.min(vfi / 150, 1));
        bar.style.background = color;
        bar.style.boxShadow = 'none';
    }

    const ppdEl = document.getElementById(`compPPD${suffix}`);
    if (ppdEl) ppdEl.textContent = `${Math.round(ppd)} PPD`;
    const ppiEl = document.getElementById(`compPPI${suffix}`);
    if (ppiEl) ppiEl.textContent = `${Math.round(ppi)} PPI`;
}

export function updateVerdict() {
    const aScore = _scores.A;
    const bScore = _scores.B;
    const verdict = document.getElementById('compVerdict');
    if (!verdict) return;

    if (isNaN(aScore) || isNaN(bScore)) return;

    const diff   = Math.abs(aScore - bScore);
    const nameA  = document.getElementById('compNameA')?.textContent || 'Display A';
    const nameB  = document.getElementById('compNameB')?.value || 'Display B';
    const safeA  = _esc(nameA);
    const safeB  = _esc(nameB);

    if (diff < 2) {
        verdict.innerHTML = `<strong>${safeA}</strong> and <strong>${safeB}</strong> are perceptually identical at these viewing distances (Δ${Math.round(diff)} VFI).`;
    } else if (diff < 5) {
        const winner = aScore > bScore ? safeA : safeB;
        const loser  = aScore > bScore ? safeB : safeA;
        verdict.innerHTML = `<strong>${winner}</strong> is practically indistinguishable from <strong>${loser}</strong> (below perceptual threshold, Δ${Math.round(diff)} VFI).`;
    } else {
        const winner = aScore > bScore ? safeA : safeB;
        const loser  = aScore > bScore ? safeB : safeA;
        const significance =
            diff < 15 ? 'marginally sharper' :
            diff < 30 ? 'noticeably sharper' : 'significantly sharper';

        verdict.innerHTML =
            `<strong>${winner}</strong> is <strong>${significance}</strong> than <strong>${loser}</strong> at your viewing distances (Δ${Math.round(diff)} VFI).`;
    }
    verdict.classList.add('has-result');
}
