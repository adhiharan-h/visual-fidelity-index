/**
 * database.js — Device Database Rendering
 *
 * Renders the sortable, filterable device table.
 * Scoring is performed live at the user's current viewing distance
 * (from shared state), so the table re-ranks whenever the user
 * changes their distance in the main calculator.
 */

import { DEVICES } from './devices.js';
import { computePPI, computePPD, computeVFI, getTier, getTierColor } from './formula.js';
import { state } from './state.js';
import { setPreset } from './calculator.js';
import { showToast } from './ui.js';

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

let _category = 'all';
let _sortCol  = 'vfi';
let _sortAsc  = false;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Re-render the device table. Called after any state change. */
export function renderDB() {
    const dist  = state.dist;
    const query = document.getElementById('dbSearch').value.toLowerCase();
    const tbody = document.getElementById('dbBody');

    const rows = DEVICES
        .filter(d => _category === 'all' || d.cat === _category)
        .filter(d => !query || d.name.toLowerCase().includes(query))
        .map(d => {
            const ppi  = computePPI(d.w, d.h, d.size);
            const ppd  = computePPD(dist, ppi);
            const vfi  = computeVFI(ppd);
            const tier = getTier(vfi);
            return { ...d, ppi, ppd, vfi, tier };
        })
        .sort((a, b) => {
            const mult = _sortAsc ? 1 : -1;
            return (a[_sortCol] - b[_sortCol]) * mult;
        });

    tbody.innerHTML = rows.map(d => `
        <tr
            onclick="window.__vfi.loadDevice(${d.w},${d.h},${d.size},${d.typicalDist},'${_esc(d.name)}')"
            onkeydown="if(event.key==='Enter'||event.key===' ')window.__vfi.loadDevice(${d.w},${d.h},${d.size},${d.typicalDist},'${_esc(d.name)}')"
            role="button"
            tabindex="0"
            aria-label="Load ${_esc(d.name)} into calculator">
            <td class="device-name">${_esc(d.name)}</td>
            <td>${d.w}×${d.h}</td>
            <td>${d.size}"</td>
            <td>${Math.round(d.ppi)}</td>
            <td class="vfi-num" style="color:${getTierColor(d.tier.cls)}">${Math.round(d.vfi)}</td>
            <td><span class="tier-badge ${d.tier.badge}">${d.tier.name}</span></td>
        </tr>
    `).join('');
}

/**
 * Filter the table by device category.
 * @param {string} cat — 'all' | 'monitor' | 'laptop' | 'phone' | 'tv'
 */
export function filterDB(cat) {
    _category = cat;
    document.querySelectorAll('.db-filter').forEach(b => {
        b.classList.toggle('active', b.dataset.cat === cat);
    });
    renderDB();
}

/**
 * Sort the table by a column.
 * Clicking the same column toggles ascending/descending.
 * @param {string} col — Column key: 'vfi' | 'ppi' | 'size'
 */
export function sortDB(col) {
    _sortAsc = _sortCol === col ? !_sortAsc : false;
    _sortCol = col;
    renderDB();
}

/**
 * Load a device from the database into the main calculator.
 * @param {number} w    — Width
 * @param {number} h    — Height
 * @param {number} size — Screen size
 * @param {number} dist — Typical viewing distance
 * @param {string} name — Device name
 */
export function loadDevice(w, h, size, dist, name) {
    setPreset(w, h, size, dist, state.scale, name);
    document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
    showToast(`Loaded: ${name}`);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** HTML-escape a string for safe inline use. */
function _esc(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
