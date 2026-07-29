/**
 * calculator.js — Main Calculator Logic
 *
 * Handles: reading inputs → running formula → updating all result DOM elements.
 * Also owns: preset loading, scale selection, use-case mode, math panel, sharing.
 */

import { state } from './state.js';
import {
    computePPI, computePPD, computeEffectivePPD, computeVFI,
    computeConfidence, computeOptimalDist, computePPIHV,
    getTier, getTierColor, RING_CIRCUMFERENCE,
} from './formula.js';
import { animateNum, showToast } from './ui.js';
import { updateComparatorA, calcComparatorB } from './comparator.js';
import { renderDB } from './database.js';

// ---------------------------------------------------------------------------
// Core calculate — called on every input change
// ---------------------------------------------------------------------------

export function calculate() {
    const w    = parseFloat(document.getElementById('width').value);
    const h    = parseFloat(document.getElementById('height').value);
    const size = parseFloat(document.getElementById('size').value);
    const dist = parseFloat(document.getElementById('dist').value);
    const sc   = state.scale;

    // Guard: skip if any input is missing or nonsensical
    if (!w || !h || !size || !dist || w < 1 || h < 1 || size < 1 || dist < 1) return;

    // Persist to shared state
    Object.assign(state, { w, h, size, dist });

    // --- Formula ---
    const ppi     = computePPI(w, h, size);
    const effPPI  = ppi / sc;

    // Horizontal / vertical PPD split
    const { ppiH, ppiV } = computePPIHV(w, h, size);
    const ppdH = computePPD(dist, ppiH / sc);
    const ppdV = computePPD(dist, ppiV / sc);

    const activePPD = computeEffectivePPD(dist, effPPI, ppiH / sc, ppiV / sc, state.useCase);
    const vfi       = computeVFI(activePPD);
    const conf      = computeConfidence(effPPI);
    const optDist   = computeOptimalDist(effPPI);

    const tier = getTier(vfi);

    // --- Update score display ---
    animateNum('vfiScore', Math.round(vfi));
    document.getElementById('scoreTier').textContent = tier.name;
    document.getElementById('scoreMessage').textContent = tier.msg;
    document.getElementById('scoreConfidence').textContent =
        `${Math.round(vfi - conf)}–${Math.round(vfi + conf)} (±${Math.round(conf)} at ±3" distance variation)`;

    // --- Update SVG ring ---
    _updateRing(vfi, tier);

    // --- Update spectrum needle ---
    _updateSpectrum(vfi);

    // --- Update metric cards ---
    animateNum('ppdVal', Math.round(ppdH));
    document.getElementById('ppdVert').textContent = `${Math.round(ppdV)} vertical`;
    animateNum('ppiVal', Math.round(ppi));
    animateNum('effPpiVal', Math.round(effPPI));
    document.getElementById('effPpiSub').textContent = sc !== 1 ? `After ${sc}× scaling` : 'Native (no scaling)';
    document.getElementById('optimalDist').textContent = `${Math.round(optDist)}"`;
    document.getElementById('optimalHint').textContent = optDist <= dist
        ? 'You\'re past Retina threshold!'
        : `Sit ≤${Math.round(optDist)}" for Retina grade`;

    // --- Update math derivation panel ---
    _updateMathPanel(w, h, size, dist, ppi, effPPI, sc, activePPD, vfi, conf);

    // --- Apply score tier theme ---
    _updateTheme(tier.cls);

    // --- Sync comparator panel A ---
    updateComparatorA(vfi, tier, ppdH, ppi);

    // --- Sync distance slider without triggering a feedback loop ---
    const slider = document.getElementById('dist-slider');
    if (slider && Math.abs(parseFloat(slider.value) - dist) > 0.5) slider.value = dist;

    // --- Update device database distance label ---
    const dbDistLabel = document.getElementById('dbDistLabel');
    if (dbDistLabel) dbDistLabel.textContent = `${dist}"`;
    renderDB();
}

// ---------------------------------------------------------------------------
// Private DOM updaters
// ---------------------------------------------------------------------------

function _updateRing(vfi, tier) {
    const pct    = Math.min(vfi / 150, 1);
    const offset = RING_CIRCUMFERENCE * (1 - pct);
    const ring   = document.getElementById('ringFill');
    if (!ring) return;
    ring.style.strokeDashoffset = offset;
    ring.style.stroke           = getTierColor(tier.cls);
}

function _updateSpectrum(vfi) {
    const pct    = Math.min(Math.max(vfi / 150, 0), 1) * 100;
    const needle = document.getElementById('spectrumNeedle');
    const label  = document.getElementById('spectrumLabel');
    if (needle) needle.style.left = `${pct}%`;
    if (label) {
        label.style.left  = `${pct}%`;
        label.textContent = Math.round(vfi);
    }
}

function _updateTheme(cls) {
    const panel = document.querySelector('.calc-results-panel');
    if (!panel) return;
    panel.className = `calc-panel calc-results-panel ${cls}`;
}

function _updateMathPanel(w, h, size, dist, ppi, effPPI, sc, activePPD, vfi, conf) {
    const mathPPI    = document.getElementById('mathPPI');
    const mathEffPPI = document.getElementById('mathEffPPI');
    const mathPPD    = document.getElementById('mathPPD');
    const mathVFI    = document.getElementById('mathVFI');
    const mathConf   = document.getElementById('mathConf');

    if (mathPPI)    mathPPI.textContent    = `PPI = √(${w}² + ${h}²) / ${size} = ${ppi.toFixed(1)} px/in`;
    if (mathEffPPI) mathEffPPI.textContent = `Eff.PPI = ${ppi.toFixed(1)} / ${sc} = ${effPPI.toFixed(1)} px/in`;
    if (mathPPD)    mathPPD.textContent    = `PPD (${state.useCase}) = ${activePPD.toFixed(1)}`;
    if (mathVFI)    mathVFI.textContent    = `VFI = (${activePPD.toFixed(1)} / 60) × 100 = ${vfi.toFixed(1)}`;

    const sigPPD = 2 * 3 * effPPI * Math.tan(0.5 * Math.PI / 180);
    if (mathConf)   mathConf.textContent   = `σ_PPD = 2 × 3 × ${effPPI.toFixed(1)} × tan(0.5°) = ${sigPPD.toFixed(1)} → ±${conf.toFixed(0)} VFI`;
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

/**
 * Load a preset configuration into the calculator inputs.
 * @param {number} w    — Width
 * @param {number} h    — Height
 * @param {number} s    — Screen size (inches)
 * @param {number} d    — Viewing distance (inches)
 * @param {number} sc   — Scale factor
 * @param {string} name — Human-readable device name
 */
export function setPreset(w, h, s, d, sc = 1, name = '') {
    document.getElementById('width').value  = w;
    document.getElementById('height').value = h;
    document.getElementById('size').value   = s;
    document.getElementById('dist').value   = d;
    document.getElementById('dist-slider').value = d;
    state.presetName = name || `${w}×${h} / ${s}"`;

    // Highlight the matching preset button
    document.querySelectorAll('.preset-btn').forEach(btn => {
        const presetAttr = btn.dataset.preset || btn.textContent.trim();
        const active = presetAttr === name || btn.textContent.trim() === name;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    state.scale = sc;
    document.querySelectorAll('.scale-btn').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.scale) === sc);
    });

    calculate();
}

/**
 * Set the OS display scaling factor and recalculate.
 * @param {number} sc — Scale factor (1, 1.25, 1.5, 2, …)
 */
export function setScale(sc) {
    state.scale = sc;
    document.querySelectorAll('.scale-btn').forEach(btn => {
        btn.classList.toggle('active', parseFloat(btn.dataset.scale) === sc);
    });
    calculate();
    calcComparatorB();
}

/**
 * Set the active use-case mode and recalculate.
 * @param {string} uc — Use case key: 'balanced' | 'text' | 'gaming' | 'design' | 'video'
 */
export function setUseCase(uc) {
    state.useCase = uc;
    document.querySelectorAll('.usecase-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.case === uc);
    });

    const hintEl = document.getElementById('useCaseHint');
    if (hintEl) {
        const hints = {
            balanced: '⚖ Balanced mode: Evaluated on standard diagonal PPD',
            text:     '📝 Text/Code mode: Evaluated on horizontal PPD (critical for text clarity & subpixel rendering)',
            gaming:   '🎮 Gaming mode: Evaluated on diagonal PPD for dynamic motion & immersion',
            design:   '🎨 Design mode: Evaluated on worst-axis PPD (ensures precision for fine lines & vectors)',
            video:    '📺 Video mode: Evaluated on vertical PPD (16:9 vertical frame resolution)',
        };
        hintEl.textContent = hints[uc] || hints.balanced;
    }

    calculate();
}

/** Toggle the math derivation panel open/closed. */
export function toggleMath() {
    const panel  = document.getElementById('mathPanel');
    const btn    = document.getElementById('mathToggleBtn');
    const isOpen = panel.classList.toggle('open');
    btn.textContent = isOpen ? 'Hide the math ▴' : 'Show the math ▾';
    btn.setAttribute('aria-expanded', isOpen);
    panel.setAttribute('aria-hidden', !isOpen);
}

/** Share current VFI result via Web Share API or clipboard fallback. */
export function shareResult() {
    const score = document.getElementById('vfiScore').textContent;
    const tier  = document.getElementById('scoreTier').textContent;
    const setup = `${state.w}×${state.h} on ${state.size}" screen at ${state.dist}" distance`;
    const text  = `My display scored ${score} VFI (${tier}) — ${setup}. Check yours at VisualFidelityIndex.com`;

    if (navigator.share) {
        navigator.share({ title: 'VFI Score', text, url: window.location.href }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(`${text}\n${window.location.href}`)
            .then(() => showToast('Score copied to clipboard!'))
            .catch(() => showToast('Copy failed — select and copy manually.'));
    } else {
        showToast('Sharing not supported in this browser.');
    }
}
