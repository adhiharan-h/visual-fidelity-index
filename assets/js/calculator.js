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

// ---------------------------------------------------------------------------
// Core calculate — called on every input change
// ---------------------------------------------------------------------------

let _urlSyncTimer = null;
function _debouncedSyncUrl(w, h, size, dist, sc) {
    clearTimeout(_urlSyncTimer);
    _urlSyncTimer = setTimeout(() => {
        try {
            const url = new URL(window.location.href);
            url.searchParams.set('w', w);
            url.searchParams.set('h', h);
            url.searchParams.set('s', size);
            url.searchParams.set('d', Math.round(dist * 10) / 10);
            if (sc !== 1) url.searchParams.set('sc', sc);
            else url.searchParams.delete('sc');
            if (state.useCase !== 'balanced') url.searchParams.set('uc', state.useCase);
            else url.searchParams.delete('uc');
            if (state.unit === 'cm') url.searchParams.set('unit', 'cm');
            else url.searchParams.delete('unit');
            try {
                window.history.replaceState({}, '', url);
            } catch (_replaceErr) {
                // Safari enforces a rate limit on replaceState (~100 calls / 30s).
                // Silently ignore SecurityError — the URL will sync on the next
                // successful call after the rate limit window resets.
            }
        } catch (_) {}
    }, 500);
}

export function calculate(animate = false) {
    const w       = parseFloat(document.getElementById('width').value);
    const h       = parseFloat(document.getElementById('height').value);
    const rawSize = parseFloat(document.getElementById('size').value);
    const rawDist = parseFloat(document.getElementById('dist').value);
    const sc      = state.scale;

    // Screen size is always entered and interpreted in standard diagonal inches
    const size = rawSize;
    // Viewing distance respects active unit toggle ('cm' converted to inches for internal physics calculation)
    const dist = state.unit === 'cm' ? (rawDist / 2.54) : rawDist;

    // Guard: skip if any input is missing or nonsensical
    if (!w || !h || !size || !dist || w < 1 || h < 1 || size < 0.5 || dist < 0.5) return;

    // Persist to shared state (size and dist are always stored in inches)
    Object.assign(state, { w, h, size, dist });

    // Sync URL search params debounced (avoids browser history IPC lockups during slider drag)
    _debouncedSyncUrl(w, h, size, dist, sc);

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

    // Formatted distance strings based on active unit
    const isMetric = state.unit === 'cm';
    const distVarText = isMetric ? '±8 cm' : '±3"';
    const optDistDisplay = isMetric ? `${Math.round(optDist * 2.54)} cm` : `${Math.round(optDist)}"`;
    const currentDistDisplay = isMetric ? `${Math.round(dist * 2.54)} cm` : `${Math.round(dist)}"`;

    // Dynamic screen size metric hint (~XX cm)
    const sizeHintEl = document.getElementById('sizeMetricHint');
    if (sizeHintEl) {
        if (isMetric && size) {
            sizeHintEl.textContent = `(~${Math.round(size * 2.54)} cm)`;
            sizeHintEl.style.display = 'inline';
        } else {
            sizeHintEl.style.display = 'none';
        }
    }

    // --- Update score display ---
    if (animate) {
        animateNum('vfiScore', Math.round(vfi));
    } else {
        const scoreEl = document.getElementById('vfiScore');
        if (scoreEl) scoreEl.textContent = Math.round(vfi);
    }
    document.getElementById('scoreTier').textContent = tier.name;
    document.getElementById('scoreMessage').textContent = tier.msg;
    document.getElementById('scoreConfidence').textContent =
        `${Math.round(vfi - conf)}–${Math.round(vfi + conf)} (±${Math.round(conf)} at ${distVarText} distance variation)`;

    // --- Update SVG ring ---
    _updateRing(vfi, tier);

    // --- Update spectrum needle ---
    _updateSpectrum(vfi, tier);

    // --- Update metric cards ---
    if (animate) {
        animateNum('ppdVal', Math.round(activePPD));
        animateNum('ppiVal', Math.round(ppi));
        animateNum('effPpiVal', Math.round(effPPI));
    } else {
        const ppdEl = document.getElementById('ppdVal');
        if (ppdEl) ppdEl.textContent = Math.round(activePPD);
        const ppiEl = document.getElementById('ppiVal');
        if (ppiEl) ppiEl.textContent = Math.round(ppi);
        const effEl = document.getElementById('effPpiVal');
        if (effEl) effEl.textContent = Math.round(effPPI);
    }
    document.getElementById('ppdVert').textContent = 'Pixels per degree';
    document.getElementById('effPpiSub').textContent = sc !== 1 ? `After ${sc}× scaling` : 'Native (no scaling)';
    document.getElementById('optimalDist').textContent = optDistDisplay;
    document.getElementById('optimalHint').textContent = optDist <= dist
        ? "You're past Retina threshold!"
        : `Sit ≤${optDistDisplay} for Retina grade`;

    // --- Update math derivation panel ---
    _updateMathPanel(w, h, size, dist, ppi, effPPI, sc, activePPD, vfi, conf);

    // --- Apply score tier theme ---
    _updateTheme(tier.cls);

    // --- Sync comparator panel A ---
    const deviceName = state.presetName || `${w}×${h} (${size}")`;
    updateComparatorA(vfi, tier, activePPD, ppi, deviceName);

    // --- Sync distance slider without triggering a feedback loop ---
    const slider = document.getElementById('dist-slider');
    const expectedSliderVal = isMetric ? Math.round(dist * 2.54) : Math.round(dist);
    if (slider && Math.abs(parseFloat(slider.value) - expectedSliderVal) > 0.5) {
        slider.value = expectedSliderVal;
    }

    // --- Update quick distance chips active highlight ---
    _highlightActiveChip(dist);

    // --- Update device database distance labels ---
    const dbDistLabel = document.getElementById('dbDistLabel');
    if (dbDistLabel) dbDistLabel.textContent = currentDistDisplay;

    const dbDistToggleLabel = document.getElementById('dbDistToggleLabel');
    if (dbDistToggleLabel) dbDistToggleLabel.textContent = currentDistDisplay;
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

function _updateSpectrum(vfi, tier) {
    const pct = Math.min(Math.max(vfi / 150, 0), 1) * 100;
    const needle = document.getElementById('spectrumNeedle');
    const label  = document.getElementById('spectrumLabel');

    const leftVal = `clamp(7px, ${pct.toFixed(2)}%, calc(100% - 7px))`;
    const labelLeftVal = `clamp(12px, ${pct.toFixed(2)}%, calc(100% - 12px))`;

    if (needle) {
        needle.style.left = leftVal;
        needle.style.setProperty('--needle-pos', `${pct.toFixed(2)}%`);
        if (tier) {
            const color = getTierColor(tier.cls);
            needle.style.borderColor = color;
            needle.style.boxShadow = `0 0 0 2px white, 0 0 10px ${color}80`;
        }
    }
    if (label) {
        label.style.left = labelLeftVal;
        label.style.setProperty('--needle-pos', `${pct.toFixed(2)}%`);
        label.textContent = Math.round(vfi);
        if (tier) {
            label.style.color = getTierColor(tier.cls);
        }
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
    const isMetric = state.unit === 'cm';
    const distVal = isMetric ? Math.round(d * 2.54) : d;

    document.getElementById('width').value  = w;
    document.getElementById('height').value = h;
    document.getElementById('size').value   = s;
    document.getElementById('dist').value   = distVal;
    document.getElementById('dist-slider').value = distVal;
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

    calculate(true);
}

/**
 * Switch measurement unit between 'in' (inches) and 'cm' (centimeters).
 * Screen size diagonal remains in standard inches; viewing distance toggles between in and cm.
 * @param {'in'|'cm'} u
 */
export function setUnit(u) {
    if (state.unit === u) return;
    state.unit = u;

    document.querySelectorAll('.unit-btn').forEach(btn => {
        const active = btn.dataset.unit === u;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const sizeInput = document.getElementById('size');
    const sizeUnitLabel = document.getElementById('sizeUnit');
    const distInput = document.getElementById('dist');
    const distSlider = document.getElementById('dist-slider');
    const distUnitLabel = document.getElementById('distUnit');
    const sizeHintEl = document.getElementById('sizeMetricHint');

    // Screen size always remains in inches
    if (sizeUnitLabel) sizeUnitLabel.textContent = 'in';
    if (sizeInput) {
        sizeInput.min = '4';
        sizeInput.max = '120';
        sizeInput.step = '0.1';
        sizeInput.value = Math.round(state.size * 10) / 10;
    }

    if (u === 'cm') {
        if (sizeHintEl) {
            sizeHintEl.textContent = `(~${Math.round(state.size * 2.54)} cm)`;
            sizeHintEl.style.display = 'inline';
        }

        if (distUnitLabel) distUnitLabel.textContent = 'cm';
        if (distSlider) {
            distSlider.min = '15';
            distSlider.max = '360';
        }
        if (distInput) {
            distInput.min = '15';
            distInput.max = '360';
            const cmVal = Math.round(state.dist * 2.54);
            distInput.value = cmVal;
            if (distSlider) distSlider.value = cmVal;
        }

        // Convert Display B distance in comparator if present
        const cdInput = document.getElementById('cd');
        if (cdInput) {
            const currentCdIn = parseFloat(cdInput.value);
            if (!isNaN(currentCdIn) && currentCdIn > 0) {
                cdInput.value = Math.round(currentCdIn * 2.54);
            }
        }

        const dIn = Math.round(state.dist);
        const dCm = Math.round(state.dist * 2.54);
        showToast(`Metric mode: Viewing distance in cm (${dIn}" → ${dCm} cm). Screen diagonal remains in standard inches.`);
    } else {
        if (sizeHintEl) {
            sizeHintEl.style.display = 'none';
        }

        if (distUnitLabel) distUnitLabel.textContent = 'in';
        if (distSlider) {
            distSlider.min = '6';
            distSlider.max = '144';
        }
        if (distInput) {
            distInput.min = '6';
            distInput.max = '144';
            const inVal = Math.round(state.dist);
            distInput.value = inVal;
            if (distSlider) distSlider.value = inVal;
        }

        // Convert Display B distance in comparator back to inches if present
        const cdInput = document.getElementById('cd');
        if (cdInput) {
            const currentCdCm = parseFloat(cdInput.value);
            if (!isNaN(currentCdCm) && currentCdCm > 0) {
                cdInput.value = Math.round(currentCdCm / 2.54);
            }
        }

        showToast('Imperial mode: Viewing distance switched to inches.');
    }

    _updateDistChipsLabels();
    calculate(false);
    calcComparatorB();
}

/**
 * Set viewing distance directly from a quick distance chip.
 * @param {number} distInches — Distance in inches
 */
export function setQuickDist(distInches) {
    state.dist = distInches;
    const distInput = document.getElementById('dist');
    const distSlider = document.getElementById('dist-slider');
    const val = state.unit === 'cm' ? Math.round(distInches * 2.54) : Math.round(distInches);
    if (distInput) distInput.value = val;
    if (distSlider) distSlider.value = val;
    calculate(true);
}

function _highlightActiveChip(distInches) {
    document.querySelectorAll('.dist-chip').forEach(chip => {
        const targetIn = parseFloat(chip.dataset.distIn);
        const active = Math.abs(distInches - targetIn) < 1.0;
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

export function _updateDistChipsLabels() {
    const isMetric = state.unit === 'cm';
    document.querySelectorAll('.dist-chip').forEach(chip => {
        const distIn = parseFloat(chip.dataset.distIn);
        const role = chip.dataset.role || '';
        if (isMetric) {
            const cm = Math.round(distIn * 2.54);
            chip.textContent = `${role} (${cm} cm)`;
        } else {
            chip.textContent = `${role} (${distIn}")`;
        }
    });
}

/**
 * Set the OS display scaling factor and recalculate.
 * @param {number} sc — Scale factor (1, 1.25, 1.5, 2, …)
 */
export function setScale(sc) {
    state.scale = sc;
    document.querySelectorAll('.scale-btn').forEach(btn => {
        const active = parseFloat(btn.dataset.scale) === sc;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
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
        const active = btn.dataset.case === uc;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    const hintEl = document.getElementById('useCaseHint');
    if (hintEl) {
        const hints = {
            balanced: '⚖ Balanced mode: Standard ISO foveal acuity baseline (60 CPD)',
            text:     '📝 Text/Code mode: Calibrated for fine typography & subpixel glyph rendering (demands ~10% higher acuity)',
            gaming:   '🎮 Gaming mode: Calibrated for dynamic motion clarity & spatial immersion',
            design:   '🎨 Design mode: Calibrated for precision vector hairlines & pixel-grid alignment',
            video:    '📺 Video mode: Calibrated for 24–60fps cinematic content (motion blur masks micro-edges)',
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
    const shareUrl = window.location.href;
    const text  = `My display scored ${score} VFI (${tier}) — ${setup}. Check yours:`;

    if (navigator.share) {
        navigator.share({ title: 'VFI Score', text, url: shareUrl }).catch((err) => {
            // Ignore user cancellation (AbortError), but fall back to clipboard for real failures
            if (err.name !== 'AbortError' && navigator.clipboard) {
                navigator.clipboard.writeText(`${text} ${shareUrl}`)
                    .then(() => showToast('Score link copied to clipboard!'))
                    .catch(() => showToast('Sharing failed.'));
            }
        });
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(`${text} ${shareUrl}`)
            .then(() => showToast('Score link copied to clipboard!'))
            .catch(() => showToast('Copy failed — select and copy manually.'));
    } else {
        showToast('Sharing not supported in this browser.');
    }
}
