/**
 * screendetect.js — Auto-Detection of User Display Setup
 *
 * Reads hardware screen resolution and pixel ratio via browser APIs
 * (window.screen.width/height, window.devicePixelRatio, matchMedia, navigator.getBattery).
 * Accurately differentiates phones, tablets, laptops (14"–16" @ 18"), and desktop displays (24"–32" @ 24").
 */

import { state } from './state.js';
import { setPreset } from './calculator.js';
import { showToast } from './ui.js';

// Proprietary / unique resolution devices where resolution uniquely identifies the device
const UNIQUE_DEVICES = [
    { w: 3024, h: 1964, size: 14.2, dist: 18, sc: 2,    name: 'MacBook Pro 14" M3' },
    { w: 3456, h: 2234, size: 16.2, dist: 20, sc: 2,    name: 'MacBook Pro 16" M3' },
    { w: 2560, h: 1664, size: 13.6, dist: 18, sc: 2,    name: 'MacBook Air 13" M2' },
    { w: 2752, h: 2064, size: 13.0, dist: 16, sc: 2,    name: 'iPad Pro 13" M4' },
    { w: 2420, h: 1668, size: 11.0, dist: 15, sc: 2,    name: 'iPad Pro 11" M4' },
    { w: 2256, h: 1504, size: 13.5, dist: 18, sc: 1.5,  name: 'Surface Laptop 5 13.5"' },
    { w: 2796, h: 1290, size: 6.7,  dist: 14, sc: 3,    name: 'iPhone 15 Pro Max' },
    { w: 2556, h: 1179, size: 6.1,  dist: 14, sc: 3,    name: 'iPhone 15 Pro' },
    { w: 3088, h: 1440, size: 6.8,  dist: 14, sc: 2,    name: 'Galaxy S24 Ultra' },
    { w: 2992, h: 1344, size: 6.7,  dist: 14, sc: 2.6,  name: 'Pixel 8 Pro' },
    { w: 3168, h: 1440, size: 6.82, dist: 14, sc: 2,    name: 'OnePlus 12' },
    { w: 5120, h: 2880, size: 27.0, dist: 24, sc: 2,    name: 'Studio Display 27" 5K' },
    { w: 6016, h: 3384, size: 32.0, dist: 26, sc: 2,    name: 'Pro Display XDR 32" 6K' },
    { w: 5120, h: 1440, size: 49.0, dist: 28, sc: 1,    name: 'Super Ultrawide 49"' }
];

let _batteryDetected = false;
if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
    navigator.getBattery().then(b => {
        if (b) _batteryDetected = true;
    }).catch(() => {});
}

/**
 * Determine display configuration from browser environment.
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

        // 1. Check for known unique proprietary hardware
        const uniqueMatch = UNIQUE_DEVICES.find(d =>
            (d.w === w && d.h === h) || (!isMobile && d.w === h && d.h === w)
        );

        let size = 14;
        let dist = 18;
        let scaleVal = 1;
        let name = '';

        if (uniqueMatch) {
            size = uniqueMatch.size;
            dist = uniqueMatch.dist;
            scaleVal = uniqueMatch.sc || 1;
            name = uniqueMatch.name;
        } else if (isMobile) {
            size = (Math.max(w, h) >= 2600) ? 6.7 : 6.1;
            dist = 14;
            scaleVal = dpr >= 2.5 ? 3 : 2;
            name = `Mobile (${w}×${h})`;
        } else if (isTablet) {
            size = 11;
            dist = 16;
            scaleVal = 2;
            name = `Tablet (${w}×${h})`;
        } else {
            // PC: Differentiate Laptop vs Desktop
            // Laptops have batteries, touch points, high mobility, and are overwhelmingly 14"–16" screens
            const hasTouch = (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
            const isLikelyLaptop = _batteryDetected || hasTouch || dpr >= 1.25 || (rawW <= 1920 && rawH <= 1200);

            if (isLikelyLaptop) {
                // Laptop display
                if (w >= 3400) {
                    size = 16;
                    dist = 20;
                    scaleVal = 2;
                    name = `Laptop 16" (${w}×${h})`;
                } else if (w >= 2560) {
                    size = 14;
                    dist = 18;
                    scaleVal = dpr >= 1.7 ? 2 : 1.5;
                    name = `Laptop 14" (${w}×${h})`;
                } else if (w >= 1920) {
                    size = 14;
                    dist = 18;
                    scaleVal = dpr >= 1.2 ? 1.25 : 1;
                    name = `Laptop 14" (1080p)`;
                } else {
                    size = 14;
                    dist = 18;
                    scaleVal = 1;
                    name = `Laptop 14" (${w}×${h})`;
                }
            } else {
                // Desktop monitor
                const aspect = w / h;
                if (aspect > 3.0) {
                    size = 49;
                    dist = 28;
                    scaleVal = 1;
                    name = `Desktop 49" Ultrawide`;
                } else if (aspect > 2.2) {
                    size = 34;
                    dist = 28;
                    scaleVal = 1;
                    name = `Desktop 34" Ultrawide`;
                } else if (w >= 3840) {
                    size = 32;
                    dist = 26;
                    scaleVal = 2;
                    name = `Desktop 32" 4K`;
                } else if (w >= 2560) {
                    size = 27;
                    dist = 24;
                    scaleVal = dpr >= 1.25 ? 1.25 : 1;
                    name = `Desktop 27" 1440p`;
                } else {
                    size = 24;
                    dist = 24;
                    scaleVal = 1;
                    name = `Desktop 24" 1080p`;
                }
            }
        }

        // Apply detected values
        setPreset(w, h, size, dist, scaleVal, name);

        // Flash input fields to provide visual confirmation
        ['width', 'height', 'size', 'dist'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.remove('input-detected-flash');
                void el.offsetWidth;
                el.classList.add('input-detected-flash');
            }
        });

        // Highlight preset buttons if matching
        document.querySelectorAll('.preset-btn').forEach(b => {
            const presetAttr = b.dataset.preset || b.textContent.trim();
            const isMatch = presetAttr === name || b.textContent.trim() === name;
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

        const isMetric = state.unit === 'cm';
        const sizeDisplay = `${size}"`;
        const distDisplay = isMetric ? `${Math.round(dist * 2.54)} cm` : `${dist}"`;
        const scaleLabel = scaleVal !== 1 ? ` @ ${scaleVal}×` : '';
        showToast(`Detected: ${w}×${h}${scaleLabel} (${name}) — ${sizeDisplay} screen, ${distDisplay} dist.`);

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
export async function initScreenDetectPreview() {
    try {
        const previewEl = document.getElementById('detectScreenPreview');
        if (!previewEl) return;

        let hasBat = _batteryDetected;
        if (!hasBat && typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
            try {
                const b = await navigator.getBattery();
                if (b) {
                    hasBat = true;
                    _batteryDetected = true;
                }
            } catch (_) {}
        }

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
        const hasTouch = (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        const deviceType = isMobile ? 'Phone' : (hasBat || hasTouch || dpr >= 1.25 || (rawW <= 1920 && rawH <= 1200) ? 'Laptop ~14"' : 'Display');
        previewEl.textContent = `Detected ~${w}×${h}${dprStr} (${deviceType}) · 1-click apply`;
    } catch (_) {}
}
