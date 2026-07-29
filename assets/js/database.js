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
    const searchInput = document.getElementById('dbSearch');
    const query = searchInput ? searchInput.value.toLowerCase() : '';
    const tbody = document.getElementById('dbBody');
    if (!tbody) return;

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
            let av = a[_sortCol];
            let bv = b[_sortCol];
            if (_sortCol === 'res') {
                av = a.w * a.h;
                bv = b.w * b.h;
            }
            if (typeof av === 'string') return av.localeCompare(bv) * mult;
            return (av - bv) * mult;
        });

    if (rows.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 24px 12px; color: var(--text-faint);">No matching devices found</td></tr>`;
        _updateHeaderSortIcons();
        return;
    }

    tbody.innerHTML = rows.map(d => `
        <tr
            data-w="${d.w}"
            data-h="${d.h}"
            data-size="${d.size}"
            data-dist="${d.typicalDist}"
            data-name="${_esc(d.name)}"
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

    _updateHeaderSortIcons();
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
 * @param {string} col — Column key: 'name' | 'res' | 'size' | 'ppi' | 'vfi'
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

function _updateHeaderSortIcons() {
    const headers = document.querySelectorAll('#dbTable th[data-sort]');
    headers.forEach(th => {
        const col = th.dataset.sort;
        const isCurrent = col === _sortCol;
        th.classList.toggle('active-sort', isCurrent);
        const arrow = isCurrent ? (_sortAsc ? ' ↑' : ' ↓') : '';
        th.setAttribute('aria-sort', isCurrent ? (_sortAsc ? 'ascending' : 'descending') : 'none');
        const baseName = th.dataset.label || th.textContent.replace(/[↑↓]/g, '').trim();
        th.dataset.label = baseName;
        th.textContent = baseName + arrow;
    });
}

/** HTML-escape a string for safe inline use. */
function _esc(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
