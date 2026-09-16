/**
 * screendetect.js — Auto-Detection of User Display Setup
 *
 * Reads hardware screen resolution and pixel ratio via browser APIs
 * (window.screen.width/height, window.devicePixelRatio, matchMedia).
 * Matches against known database devices when possible, or provides
 * smart heuristic estimation for diagonal size, distance, and OS scale.
 */

import { state } from './state.js';
import { DEVICES } from './devices.js';
import { setPreset } from './calculator.js';
import { showToast } from './ui.js';

/**
 * Detect user display resolution and configuration, pre-filling the calculator.
 */
export function detectScreen() {
    try {
        const dpr = window.devicePixelRatio || 1;
        const rawW = window.screen.width || window.innerWidth || 1920;
        const rawH = window.screen.height || window.innerHeight || 1080;

        // Physical display resolution
        let w = Math.round(rawW * dpr);
        let h = Math.round(rawH * dpr);

        // Detect device form factor
        const userAgent = navigator.userAgent || '';
        const isMobile = /Mobi|Android|iPhone/i.test(userAgent) ||
                         (window.matchMedia && window.matchMedia('(max-width: 767px) and (pointer: coarse)').matches);
        const isTablet = !isMobile && (/iPad|Tablet/i.test(userAgent) ||
                         (window.matchMedia && window.matchMedia('(min-width: 768px) and (max-width: 1180px) and (pointer: coarse)').matches));

        // For non-mobile displays, enforce landscape resolution orientation
        if (!isMobile && w < h) {
            [w, h] = [h, w];
        }

        // Clamp to valid range
        w = Math.max(640, Math.min(w, 15360));
        h = Math.max(480, Math.min(h, 8640));

        // Attempt exact matching with known device database
        const matched = DEVICES.find(d =>
            (d.w === w && d.h === h) || (!isMobile && d.w === h && d.h === w)
        );

        let size = 27;
        let dist = 24;
        let name = '';

        if (matched) {
            size = matched.size;
            dist = matched.typicalDist;
            name = matched.name;
        } else if (isMobile) {
            size = (Math.max(w, h) >= 2600) ? 6.7 : 6.1;
            dist = 14;
            name = `Mobile (${w}×${h})`;
        } else if (isTablet) {
            size = 11;
            dist = 16;
            name = `Tablet (${w}×${h})`;
        } else {
            // Laptop vs Desktop heuristic
            const isLikelyLaptop = dpr >= 1.5 && (rawW <= 1800 || rawH <= 1200);
            if (isLikelyLaptop) {
                if (w >= 3000) size = 16;
                else if (w >= 2500) size = 14;
                else size = 13.5;
                dist = 18;
                name = `Laptop (${w}×${h})`;
            } else {
                // Desktop monitor
                const aspect = w / h;
                if (aspect > 3.0) size = 49;        // 32:9 Super Ultrawide
                else if (aspect > 2.2) size = 34;   // 21:9 Ultrawide
                else if (w >= 3840) size = 32;      // 4K desktop
                else if (w >= 2560) size = 27;      // 1440p
                else size = 24;                     // 1080p
                dist = 24;
                name = `Desktop (${w}×${h})`;
            }
        }

        // Recommended OS scale factor
        let scaleVal = 1;
        if (dpr >= 1.85) scaleVal = 2;
        else if (dpr >= 1.35) scaleVal = 1.5;
        else if (dpr >= 1.15) scaleVal = 1.25;

        // Apply detected values
        setPreset(w, h, size, dist, scaleVal, name);

        // Flash input fields to provide visual confirmation
        ['width', 'height', 'size', 'dist'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('input-detected-flash');
                // Force reflow
                void el.offsetWidth;
                el.classList.add('input-detected-flash');
            }
        });

        // Deselect preset buttons since custom detection was run
        document.querySelectorAll('.preset-btn').forEach(b => {
            const isMatch = b.dataset.preset === name;
            b.classList.toggle('active', isMatch);
            b.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
        });

        // Visual feedback on the Detect button itself
        const btn = document.getElementById('detectScreenBtn');
        const ctaText = document.getElementById('detectScreenCtaText');
        if (btn) {
            btn.classList.add('applied');
            if (ctaText) ctaText.textContent = 'Applied ✓';
            setTimeout(() => {
                btn.classList.remove('applied');
                if (ctaText) ctaText.textContent = 'Auto Fill →';
            }, 2500);
        }

        const scaleLabel = scaleVal !== 1 ? ` @ ${scaleVal}× scale` : '';
        showToast(`Detected: ${w}×${h}${scaleLabel} (${name}) — verify screen size`);

        return { w, h, size, dist, scaleVal, name };
    } catch (err) {
        console.error('Screen auto-detection failed:', err);
        showToast('Screen detection failed — enter specifications manually.');
        return null;
    }
}

/**
 * Previews detected screen info on page load inside the detection banner.
 */
export function initScreenDetectPreview() {
    try {
        const previewEl = document.getElementById('detectScreenPreview');
        if (!previewEl) return;
        const dpr = window.devicePixelRatio || 1;
        const rawW = window.screen.width || window.innerWidth || 1920;
        const rawH = window.screen.height || window.innerHeight || 1080;
        let w = Math.round(rawW * dpr);
        let h = Math.round(rawH * dpr);
        const userAgent = navigator.userAgent || '';
        const isMobile = /Mobi|Android|iPhone/i.test(userAgent) ||
                         (window.matchMedia && window.matchMedia('(max-width: 767px) and (pointer: coarse)').matches);
        if (!isMobile && w < h) {
            [w, h] = [h, w];
        }
        const dprStr = dpr !== 1 ? ` · ${dpr}× DPR` : '';
        previewEl.textContent = `Detected ~${w}×${h}${dprStr} · 1-click apply`;
    } catch (_) {}
}
