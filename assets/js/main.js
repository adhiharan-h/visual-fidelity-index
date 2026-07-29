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
import { calculate, setPreset, setScale, setUseCase, toggleMath, shareResult } from './calculator.js';
import { calcComparatorB } from './comparator.js';
import { renderDB, filterDB, sortDB, loadDevice } from './database.js';
import { setupTooltips, setupNavbar, setupHamburger } from './ui.js';
import { RING_CIRCUMFERENCE } from './formula.js';

// ---------------------------------------------------------------------------
// Expose minimal global API for inline HTML handlers
// ---------------------------------------------------------------------------

window.__vfi = {
    setPreset,
    setScale,
    setUseCase,
    toggleMath,
    shareResult,
    filterDB,
    sortDB,
    loadDevice,
};

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

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
                calculate();
            });
        }
    });

    // Distance slider — bidirectionally synced with the number input
    const slider = document.getElementById('dist-slider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            const distInput = document.getElementById('dist');
            if (distInput) distInput.value = e.target.value;
            calculate();
        });
    }

    // Comparator Panel B inputs
    ['cw', 'ch', 'cs', 'cd'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calcComparatorB);
    });

    // Device database search
    const dbSearch = document.getElementById('dbSearch');
    if (dbSearch) dbSearch.addEventListener('input', renderDB);

    // Preset buttons delegation (CSP compliant)
    const presetsContainer = document.querySelector('.presets');
    if (presetsContainer) {
        presetsContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.preset-btn');
            if (!btn) return;
            const onclickAttr = btn.getAttribute('onclick');
            if (onclickAttr) {
                const match = onclickAttr.match(/setPreset\((\d+),\s*(\d+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*['"]([^'"]+)['"]\)/);
                if (match) {
                    const [, w, h, s, d, sc, name] = match;
                    setPreset(parseFloat(w), parseFloat(h), parseFloat(s), parseFloat(d), parseFloat(sc), name);
                    return;
                }
            }
            const presetName = btn.dataset.preset || btn.textContent.trim();
            if (presetName === '27" 1440p') setPreset(2560, 1440, 27, 24, 1, '27" 1440p');
            else if (presetName === '27" 1080p') setPreset(1920, 1080, 27, 24, 1, '27" 1080p');
            else if (presetName === '27" 4K') setPreset(3840, 2160, 27, 24, 1, '27" 4K');
            else if (presetName === 'iPhone 15 Pro Max' || presetName === 'iPhone 15 Pro') setPreset(2796, 1290, 6.7, 14, 3, 'iPhone 15 Pro Max');
            else if (presetName.includes('MacBook')) setPreset(3024, 1964, 14.2, 18, 2, 'MacBook Pro 14"');
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

    // Math toggle & Share buttons
    const mathBtn = document.getElementById('mathToggleBtn');
    if (mathBtn) mathBtn.addEventListener('click', toggleMath);

    const shareBtn = document.querySelector('.share-btn-new');
    if (shareBtn) shareBtn.addEventListener('click', shareResult);

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

    // Run with default values (state.js defaults = 27" 1440p @ 24")
    calculate();
    calcComparatorB();
    renderDB();
}

document.addEventListener('DOMContentLoaded', init);
