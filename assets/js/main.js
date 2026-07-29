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
