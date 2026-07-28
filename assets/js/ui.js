/**
 * ui.js — Shared UI Utilities
 *
 * Reusable DOM helpers used by multiple modules:
 *   - Animated number counter
 *   - Toast notification
 *   - Contextual tooltip system
 *   - Navbar scroll shadow
 */

// ---------------------------------------------------------------------------
// Animated number counter
// ---------------------------------------------------------------------------

/** Tracks active animation frame IDs per element (to cancel on re-trigger). */
const _animFrames = {};

/**
 * Animate an element's text content from its current value to a target number.
 * Uses an ease-out cubic curve for a natural deceleration feel.
 *
 * @param {string} id     — DOM element ID
 * @param {number} target — Target integer value
 */
export function animateNum(id, target) {
    const el = document.getElementById(id);
    if (!el) return;

    const current = parseInt(el.textContent, 10) || 0;
    if (current === target) return;

    if (_animFrames[id]) cancelAnimationFrame(_animFrames[id]);

    const start    = performance.now();
    const duration = 400; // ms

    function step(now) {
        const t    = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
        el.textContent = Math.round(current + (target - current) * ease);
        if (t < 1) {
            _animFrames[id] = requestAnimationFrame(step);
        } else {
            el.textContent   = target;
            delete _animFrames[id];
        }
    }
    _animFrames[id] = requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------
// Toast notification
// ---------------------------------------------------------------------------

let _toastTimer = null;

/**
 * Show a temporary toast notification at the bottom-right of the screen.
 * @param {string} msg     — Message text
 * @param {number} duration — Milliseconds before auto-dismiss (default 3000)
 */
export function showToast(msg, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = msg;
    toast.classList.add('show');

    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ---------------------------------------------------------------------------
// Contextual tooltip
// ---------------------------------------------------------------------------

/**
 * Attach hover + focus tooltip behaviour to all elements with [data-tip].
 * Positions the tooltip near the cursor, clamping to viewport edges.
 * Should be called once on DOMContentLoaded.
 */
export function setupTooltips() {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return;

    document.querySelectorAll('[data-tip]').forEach(el => {
        const show = (e) => {
            tooltip.textContent = el.dataset.tip;
            tooltip.classList.add('visible');
            _positionTooltip(e);
        };
        el.addEventListener('mouseenter', show);
        el.addEventListener('mousemove',  _positionTooltip);
        el.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));
        el.addEventListener('focus',      show);
        el.addEventListener('blur',       () => tooltip.classList.remove('visible'));
    });
}

function _positionTooltip(e) {
    const tooltip = document.getElementById('tooltip');
    if (!tooltip) return;
    const x  = e.clientX + 14;
    const y  = e.clientY + 14;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    tooltip.style.left = `${Math.min(x, window.innerWidth  - tw - 8)}px`;
    tooltip.style.top  = `${Math.min(y, window.innerHeight - th - 8)}px`;
}

// ---------------------------------------------------------------------------
// Navbar scroll shadow
// ---------------------------------------------------------------------------

/**
 * Add/remove the `.scrolled` class on the navbar based on scroll position.
 * Should be called once on DOMContentLoaded.
 */
export function setupNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
}

// ---------------------------------------------------------------------------
// Mobile hamburger menu
// ---------------------------------------------------------------------------

/**
 * Wire up the hamburger button to toggle the mobile nav drawer.
 * Also closes the menu when a mobile link is tapped.
 * Should be called once on DOMContentLoaded.
 */
export function setupHamburger() {
    const btn  = document.getElementById('navHamburger');
    const menu = document.getElementById('navMobileMenu');
    if (!btn || !menu) return;

    function toggle(forceClose = false) {
        const willOpen = forceClose ? false : !menu.classList.contains('open');
        menu.classList.toggle('open', willOpen);
        btn.classList.toggle('open', willOpen);
        btn.setAttribute('aria-expanded', willOpen);
        btn.setAttribute('aria-label', willOpen ? 'Close navigation menu' : 'Open navigation menu');
    }

    btn.addEventListener('click', () => toggle());

    // Close when any link inside the mobile menu is clicked
    menu.querySelectorAll('.nav-mobile-link').forEach(link => {
        link.addEventListener('click', () => toggle(true));
    });

    // Close when clicking outside the navbar
    document.addEventListener('click', (e) => {
        const navbar = document.getElementById('navbar');
        if (navbar && !navbar.contains(e.target)) toggle(true);
    }, { passive: true });
}
