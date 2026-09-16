/**
 * main.js — Application Entry Point
 *
 * This file does one job: wire everything together.
 * - Imports all modules
 * - Attaches all event listeners
 * - Exposes the minimal global API needed for inline HTML event handlers
 * - Runs the initial calculation on page load
 *
 * Why a global __vfi object?
 * ES modules are scoped — functions defined in modules are not accessible
 * from inline HTML onclick="" attributes. Rather than moving to a full
 * framework, we expose a single namespaced global (__vfi) containing
 * only the functions that HTML needs to call. Everything else stays
 * module-private.
 */

import { state } from './state.js';
import { calculate, setPreset, setScale, setUseCase, setUnit, setQuickDist, toggleMath, shareResult } from './calculator.js';
import { calcComparatorB, updateVerdict } from './comparator.js';
import { renderDB, filterDB, sortDB, loadDevice, setDBDistMode } from './database.js';
import { setupTooltips, setupNavbar, setupHamburger } from './ui.js';
import { RING_CIRCUMFERENCE } from './formula.js';

// ---------------------------------------------------------------------------
// Expose minimal global API for inline HTML handlers
// ---------------------------------------------------------------------------

window.__vfi = {
    setPreset,
    setScale,
    setUseCase,
    setUnit,
    setQuickDist,
    setDBDistMode,
    toggleMath,
    shareResult,
    filterDB,
    sortDB,
    loadDevice,
};

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

let _debounceTimer = null;
function _debouncedCalculate() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => {
        calculate();
        renderDB();
    }, 80);
}

function setupListeners() {
    // Main calculator inputs — recalculate on every keystroke
    ['width', 'height', 'size', 'dist'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                // Clear active preset highlight when the user manually edits a value
                document.querySelectorAll('.preset-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                state.presetName = '';
                _debouncedCalculate();
            });
        }
    });

    // Distance slider — bidirectionally synced with the number input
    let _sliderDBTimer = null;
    const slider = document.getElementById('dist-slider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            const distInput = document.getElementById('dist');
            if (distInput) distInput.value = e.target.value;
            calculate();
            // Debounce the expensive DB table rebuild while dragging
            clearTimeout(_sliderDBTimer);
            _sliderDBTimer = setTimeout(renderDB, 200);
        });
    }

    // Comparator Panel B inputs
    ['cw', 'ch', 'cs', 'cd'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calcComparatorB);
    });

    const compNameB = document.getElementById('compNameB');
    if (compNameB) compNameB.addEventListener('input', updateVerdict);

    // Device database search
    const dbSearch = document.getElementById('dbSearch');
    if (dbSearch) dbSearch.addEventListener('input', renderDB);

    // Preset buttons delegation (CSP compliant)
    const presetsContainer = document.querySelector('.presets');
    if (presetsContainer) {
        presetsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.preset-btn');
            if (!btn) return;
            const presetName = btn.dataset.preset || btn.textContent.trim();
            if (presetName === '27" 1440p') setPreset(2560, 1440, 27, 24, 1, '27" 1440p');
            else if (presetName === '27" 1080p') setPreset(1920, 1080, 27, 24, 1, '27" 1080p');
            else if (presetName === '27" 4K') setPreset(3840, 2160, 27, 24, 1, '27" 4K');
            else if (presetName === 'iPhone 15 Pro Max' || presetName === 'iPhone 15 Pro') setPreset(2796, 1290, 6.7, 14, 1, 'iPhone 15 Pro Max');
            else if (presetName.includes('MacBook')) setPreset(3024, 1964, 14.2, 18, 1, 'MacBook Pro 14"');
            else if (presetName.includes('65')) setPreset(3840, 2160, 65, 84, 1, '65" 4K TV');
            else if (presetName.includes('55')) setPreset(1920, 1080, 55, 84, 1, '55" 1080p TV');
            else if (presetName.includes('Surface')) setPreset(2256, 1504, 13.5, 18, 1, 'Surface Laptop 5');
        });
    }

    // Scale buttons delegation
    const scaleContainer = document.querySelector('.scale-btns');
    if (scaleContainer) {
        scaleContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.scale-btn');
            if (!btn) return;
            const sc = parseFloat(btn.dataset.scale);
            if (!isNaN(sc)) setScale(sc);
        });
    }

    // Use case buttons delegation
    const usecaseContainer = document.querySelector('.usecase-btns');
    if (usecaseContainer) {
        usecaseContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.usecase-btn');
            if (!btn) return;
            const uc = btn.dataset.case;
            if (uc) setUseCase(uc);
        });
    }

    // Unit toggle delegation (Inches vs Centimeters)
    const unitContainer = document.querySelector('.unit-toggle');
    if (unitContainer) {
        unitContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.unit-btn');
            if (!btn) return;
            const u = btn.dataset.unit;
            if (u) setUnit(u);
        });
    }

    // Quick distance chips delegation
    const distChipsContainer = document.querySelector('.dist-chips');
    if (distChipsContainer) {
        distChipsContainer.addEventListener('click', (e) => {
            const chip = e.target.closest('.dist-chip');
            if (!chip) return;
            const distIn = parseFloat(chip.dataset.distIn);
            if (!isNaN(distIn)) setQuickDist(distIn);
        });
    }

    // Math toggle & Share buttons
    const mathBtn = document.getElementById('mathToggleBtn');
    if (mathBtn) mathBtn.addEventListener('click', toggleMath);

    const shareBtn = document.querySelector('.share-btn-new');
    if (shareBtn) shareBtn.addEventListener('click', shareResult);

    // Database Distance Evaluation Mode Toggle
    const dbDistToggle = document.querySelector('.db-dist-toggle');
    if (dbDistToggle) {
        dbDistToggle.addEventListener('click', (e) => {
            const btn = e.target.closest('.db-dist-btn');
            if (!btn) return;
            const mode = btn.dataset.distMode;
            if (mode) setDBDistMode(mode);
        });
    }

    // Database Category Filters
    const filterContainer = document.querySelector('.db-filter-btns');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.db-filter');
            if (!btn) return;
            const cat = btn.dataset.cat;
            if (cat) filterDB(cat);
        });
    }

    // Database Header Sort
    const dbTable = document.getElementById('dbTable');
    if (dbTable) {
        const thead = dbTable.querySelector('thead');
        if (thead) {
            thead.addEventListener('click', (e) => {
                const th = e.target.closest('th[data-sort]');
                if (!th) return;
                const col = th.dataset.sort;
                if (col) sortDB(col);
            });
            thead.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    const th = e.target.closest('th[data-sort]');
                    if (!th) return;
                    e.preventDefault();
                    const col = th.dataset.sort;
                    if (col) sortDB(col);
                }
            });
        }
    }

    // Device database row clicks via event delegation
    const dbBody = document.getElementById('dbBody');
    if (dbBody) {
        dbBody.addEventListener('click', (e) => {
            const tr = e.target.closest('tr[data-w]');
            if (!tr) return;
            const { w, h, size, dist, name } = tr.dataset;
            loadDevice(parseFloat(w), parseFloat(h), parseFloat(size), parseFloat(dist), name);
        });

        dbBody.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const tr = e.target.closest('tr[data-w]');
                if (!tr) return;
                e.preventDefault();
                const { w, h, size, dist, name } = tr.dataset;
                loadDevice(parseFloat(w), parseFloat(h), parseFloat(size), parseFloat(dist), name);
            }
        });
    }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

function init() {
    // One-time UI setup
    setupNavbar();
    setupHamburger();
    setupTooltips();
    setupListeners();

    // Initialise SVG ring dasharray (must match RING_CIRCUMFERENCE in formula.js)
    const ring = document.getElementById('ringFill');
    if (ring) {
        ring.style.strokeDasharray  = RING_CIRCUMFERENCE;
        ring.style.strokeDashoffset = RING_CIRCUMFERENCE;
    }

    // Restore state from URL params if present
    try {
        const params = new URLSearchParams(window.location.search);
        const w = parseFloat(params.get('w'));
        const h = parseFloat(params.get('h'));
        const s = parseFloat(params.get('s'));
        const d = parseFloat(params.get('d'));
        const sc = parseFloat(params.get('sc'));
        const uc = params.get('uc');

        if (w && h && s && d && w >= 1 && h >= 1 && s >= 1 && d >= 1) {
            document.getElementById('width').value = w;
            document.getElementById('height').value = h;
            document.getElementById('size').value = s;
            document.getElementById('dist').value = d;
            const slider = document.getElementById('dist-slider');
            if (slider) slider.value = d;
            state.presetName = `${w}×${h} / ${s}"`;
        }
        if (sc && !isNaN(sc) && sc >= 1) {
            state.scale = sc;
            document.querySelectorAll('.scale-btn').forEach(btn => {
                btn.classList.toggle('active', parseFloat(btn.dataset.scale) === sc);
            });
        }
        if (uc) {
            state.useCase = uc;
            document.querySelectorAll('.usecase-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.case === uc);
            });
        }
        const unitParam = params.get('unit') || params.get('u');
        if (unitParam === 'cm' || unitParam === 'in') {
            setUnit(unitParam);
        }
        const dbmParam = params.get('dbdist') || params.get('dbm');
        if (dbmParam === 'custom' || dbmParam === 'typical') {
            setDBDistMode(dbmParam);
        }
    } catch (_) {}

    // Run calculation
    calculate();
    calcComparatorB();
    renderDB();
}

document.addEventListener('DOMContentLoaded', init);
