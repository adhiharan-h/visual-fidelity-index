/**
 * sharecard.js — Dynamic Visual Share Card Generation & Modal
 *
 * Renders a high-resolution (2400×1260, 2× DPR for 1200×630) benchmark-style
 * graphic score card directly to an HTML5 canvas. Provides direct clipboard
 * copying (ClipboardItem PNG blob), PNG download, native share sheet,
 * and link sharing.
 */

import { state } from './state.js';
import {
    computePPI,
    computePPIHV,
    computeEffectivePPD,
    computeVFI,
    getTier,
    getTierColor,
    computeOptimalDist
} from './formula.js';
import { showToast } from './ui.js';

let _activeBlob = null;

// ---------------------------------------------------------------------------
// Canvas Rendering
// ---------------------------------------------------------------------------

/**
 * Render the full 1200×630 (2400×1260 physical) graphic score card to canvas.
 * @param {HTMLCanvasElement} canvas
 */
export async function renderShareCard(canvas) {
    if (!canvas) return;

    // Ensure web fonts are rendered properly if ready
    if (document.fonts && document.fonts.ready) {
        try {
            await document.fonts.ready;
        } catch (_) {}
    }

    const ctx = canvas.getContext('2d');
    const width = 1200;
    const height = 630;

    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    // Compute active metrics
    const w = state.w;
    const h = state.h;
    const size = state.size;
    const dist = state.dist;
    const sc = state.scale || 1;
    const useCase = state.useCase || 'balanced';

    const ppi = computePPI(w, h, size);
    const effPPI = ppi / sc;
    const { ppiH, ppiV } = computePPIHV(w, h, size);
    const activePPD = computeEffectivePPD(dist, effPPI, ppiH / sc, ppiV / sc, useCase);
    const vfi = computeVFI(activePPD);
    const tier = getTier(vfi);
    const optDist = computeOptimalDist(effPPI);
    const tierColor = getTierColor(tier.cls);

    // 1. Deep space background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // 2. Ambient radial glows
    // Top-right brand glow
    const trGlow = ctx.createRadialGradient(width - 160, 100, 20, width - 160, 100, 360);
    trGlow.addColorStop(0, 'rgba(99, 102, 241, 0.16)');
    trGlow.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = trGlow;
    ctx.fillRect(0, 0, width, height);

    // Center-left score tier glow
    const scoreGlow = ctx.createRadialGradient(210, 250, 20, 210, 250, 320);
    scoreGlow.addColorStop(0, _hexToRgba(tierColor, 0.22));
    scoreGlow.addColorStop(1, _hexToRgba(tierColor, 0));
    ctx.fillStyle = scoreGlow;
    ctx.fillRect(0, 0, width, height);

    // Subtle inner card container
    _roundRect(ctx, 28, 28, width - 56, height - 56, 20);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3. Header Bar
    // Logo Mark
    _roundRect(ctx, 56, 56, 40, 40, 10);
    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Eye / screen glyph inside logo
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(76, 76, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(76, 76, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // App Name & Tagline
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 19px "Space Grotesk", -apple-system, sans-serif';
    ctx.fillText('VISUAL FIDELITY INDEX', 108, 74);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 12px Inter, -apple-system, sans-serif';
    ctx.fillText('Real-World Display Sharpness Standard', 108, 91);

    // Right domain badge
    _roundRect(ctx, width - 246, 58, 190, 34, 17);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 13px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('visualfidelityindex.com', width - 151, 80);
    ctx.textAlign = 'left';

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(56, 116);
    ctx.lineTo(width - 56, 116);
    ctx.stroke();

    // 4. Hero Score Section
    // Left: Circular Score Gauge
    const gaugeX = 180;
    const gaugeY = 240;
    const gaugeR = 74;

    // Track
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Progress Arc
    const pct = Math.min(Math.max(vfi / 150, 0.03), 1);
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (pct * Math.PI * 2);
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR, startAngle, endAngle);
    ctx.strokeStyle = tierColor;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inside gauge text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 60px "Space Grotesk", sans-serif';
    ctx.fillText(Math.round(vfi).toString(), gaugeX, gaugeY + 16);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 12px "Space Grotesk", sans-serif';
    ctx.fillText('VFI SCORE', gaugeX, gaugeY + 36);

    // Right of gauge: Tier and Human Verdict
    ctx.textAlign = 'left';
    const heroTextX = 300;

    // Tier badge pill
    const tierName = tier.name;
    ctx.font = '700 13px "Space Grotesk", sans-serif';
    const tierTextWidth = ctx.measureText(tierName).width;
    const pillW = tierTextWidth + 24;
    _roundRect(ctx, heroTextX, 172, pillW, 28, 14);
    ctx.fillStyle = _hexToRgba(tierColor, 0.18);
    ctx.fill();
    ctx.strokeStyle = tierColor;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = tierColor;
    ctx.fillText(tierName, heroTextX + 12, 191);

    // Large headline
    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 24px Inter, -apple-system, sans-serif';
    ctx.fillText(_getCardHeadline(vfi), heroTextX, 235);

    // Description
    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 15px Inter, -apple-system, sans-serif';
    ctx.fillText(tier.msg, heroTextX, 264);

    // Acuity baseline footnote
    ctx.fillStyle = '#64748b';
    ctx.font = '500 13px Inter, -apple-system, sans-serif';
    ctx.fillText('Normalized to 60 Cycles/Degree ISO foveal acuity limit (20/20 vision)', heroTextX, 292);

    // 5. Specs Grid (3 cards)
    const cardY = 352;
    const cardH = 152;
    const cardW = 340;
    const gap = 34;
    const startX = 56;

    // Spec Box 1: Hardware Setup
    const isMetric = state.unit === 'cm';
    const aspect = _computeAspectRatio(w, h);
    const sizeFormatted = isMetric ? `${Math.round(size * 2.54 * 10) / 10} cm (${size}")` : `${size}"`;
    _drawSpecBox(ctx, startX, cardY, cardW, cardH, 'DISPLAY SETUP', `${w} × ${h}`, `${sizeFormatted} screen (${aspect})`);

    // Spec Box 2: Distance
    const distText = isMetric ? `${Math.round(dist * 2.54)} cm` : `${Math.round(dist)}"`;
    const optDistText = isMetric ? `${Math.round(optDist * 2.54)} cm` : `${Math.round(optDist)}"`;
    _drawSpecBox(ctx, startX + cardW + gap, cardY, cardW, cardH, 'VIEWING DISTANCE', distText, `Retina threshold at ≤ ${optDistText}`);

    // Spec Box 3: Sharpness / Acuity
    _drawSpecBox(ctx, startX + (cardW + gap) * 2, cardY, cardW, cardH, 'ANGULAR RESOLUTION', `${Math.round(activePPD)} PPD`, `${Math.round(ppi)} physical PPI • ${Math.round(effPPI)} eff.`);

    // 6. Bottom Footer
    ctx.fillStyle = '#64748b';
    ctx.font = '500 13px Inter, -apple-system, sans-serif';
    ctx.fillText('Does your screen pass the sharpness test? Calculate yours free at', 56, 560);

    ctx.fillStyle = '#818cf8';
    ctx.font = '600 13px "Space Grotesk", sans-serif';
    ctx.fillText('visualfidelityindex.com', 484, 560);

    // Cache PNG blob
    canvas.toBlob((blob) => {
        _activeBlob = blob;
    }, 'image/png');
}

// ---------------------------------------------------------------------------
// Modal Management & User Actions
// ---------------------------------------------------------------------------

/** Open the share card modal dialog and render the latest score card. */
export function openShareModal() {
    const backdrop = document.getElementById('shareModalBackdrop');
    const canvas = document.getElementById('shareCanvas');
    if (!backdrop || !canvas) return;

    backdrop.style.display = 'flex';
    // Force reflow
    void backdrop.offsetWidth;
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');

    renderShareCard(canvas);
}

/** Close the share card modal dialog. */
export function closeShareModal() {
    const backdrop = document.getElementById('shareModalBackdrop');
    if (!backdrop) return;

    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
        if (!backdrop.classList.contains('open')) {
            backdrop.style.display = 'none';
        }
    }, 200);
}

/** Copy the card image directly to clipboard as a PNG blob. */
export async function copyCardImage() {
    const canvas = document.getElementById('shareCanvas');
    if (!canvas) return;

    try {
        canvas.toBlob(async (blob) => {
            if (!blob) {
                showToast('Could not generate image.');
                return;
            }
            if (navigator.clipboard && window.ClipboardItem) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    showToast('Image copied to clipboard! Paste in Discord, Reddit, or X.');
                    return;
                } catch (err) {
                    console.warn('Direct image clipboard copy denied, falling back to download:', err);
                }
            }
            downloadCardImage();
        }, 'image/png');
    } catch (err) {
        console.error('Clipboard copy error:', err);
        downloadCardImage();
    }
}

/** Download the rendered card as a PNG file. */
export function downloadCardImage() {
    const canvas = document.getElementById('shareCanvas');
    if (!canvas) return;

    try {
        const vfi = parseInt(document.getElementById('vfiScore')?.textContent, 10) || 76;
        const filename = `vfi-score-${state.w}x${state.h}-${vfi}vfi.png`;
        const dataUrl = canvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast('Score card PNG downloaded!');
    } catch (err) {
        console.error('Download card error:', err);
        showToast('Download failed.');
    }
}

/** Trigger native Web Share API with image file or URL fallback. */
export async function nativeShareCard() {
    const canvas = document.getElementById('shareCanvas');
    const score = document.getElementById('vfiScore')?.textContent || '76';
    const tier = document.getElementById('scoreTier')?.textContent || '';
    const text = `My display scored ${score} VFI (${tier}) on Visual Fidelity Index! Check yours:`;
    const shareUrl = window.location.href;

    if (canvas && navigator.canShare) {
        canvas.toBlob(async (blob) => {
            if (blob) {
                const file = new File([blob], `vfi-score-${score}.png`, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({
                            title: `VFI Display Score: ${score}`,
                            text,
                            files: [file],
                            url: shareUrl
                        });
                        return;
                    } catch (e) {
                        if (e.name === 'AbortError') return;
                    }
                }
            }
            _fallbackShare(text, shareUrl);
        }, 'image/png');
    } else {
        _fallbackShare(text, shareUrl);
    }
}

function _fallbackShare(text, shareUrl) {
    if (navigator.share) {
        navigator.share({ title: 'VFI Display Score', text, url: shareUrl }).catch(err => {
            if (err.name !== 'AbortError') copyLink();
        });
    } else {
        copyLink();
    }
}

/** Copy the active shareable URL with parameters to clipboard. */
export function copyLink() {
    const url = window.location.href;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url)
            .then(() => showToast('Share link copied to clipboard!'))
            .catch(() => showToast('Copy failed.'));
    } else {
        showToast('Clipboard not supported.');
    }
}

// ---------------------------------------------------------------------------
// Canvas Helpers
// ---------------------------------------------------------------------------

function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function _hexToRgba(hex, alpha) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function _getCardHeadline(vfi) {
    if (vfi >= 133) return 'Beyond Human Biological Visual Limits';
    if (vfi >= 100) return 'Retina Class — Zero Visible Pixelation';
    if (vfi >= 75)  return 'High Fidelity — Pixels Very Hard to See';
    if (vfi >= 55)  return 'Standard Fidelity — Casual Sharpness';
    if (vfi >= 33)  return 'Low Fidelity — Visible Pixel Grid in Text';
    return 'Pixelated Display — Soft at This Distance';
}

function _computeAspectRatio(w, h) {
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const d = gcd(w, h);
    const aw = w / d;
    const ah = h / d;
    if (aw === 16 && ah === 9) return '16:9';
    if (aw === 16 && ah === 10) return '16:10';
    if (aw === 21 && ah === 9) return '21:9';
    if (aw === 32 && ah === 9) return '32:9';
    if (aw === 4 && ah === 3) return '4:3';
    return `${(w / h).toFixed(2)}:1`;
}

function _drawSpecBox(ctx, x, y, w, h, label, mainText, subText) {
    // Card background
    _roundRect(ctx, x, y, w, h, 14);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillText(label, x + 20, y + 36);

    // Value
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 24px "Space Grotesk", sans-serif';
    ctx.fillText(mainText, x + 20, y + 80);

    // Subtext
    ctx.fillStyle = '#64748b';
    ctx.font = '500 13px Inter, -apple-system, sans-serif';
    ctx.fillText(subText, x + 20, y + 118);
}
