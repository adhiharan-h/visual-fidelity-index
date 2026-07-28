/**
 * state.js — Application State
 *
 * A single, shared state object that all modules read and write.
 * Centralising state here prevents modules from needing to talk to
 * each other directly, reducing coupling.
 */

export const state = {
    /** Current display resolution (pixels) */
    w: 2560,
    h: 1440,

    /** Physical screen size (inches, diagonal) */
    size: 27,

    /** Viewing distance (inches) */
    dist: 24,

    /** OS display scaling factor (1 = native, 2 = HiDPI/Retina) */
    scale: 1,

    /** Active use-case mode — affects future weighting extensions */
    useCase: 'balanced',

    /** Human-readable name of the currently loaded preset */
    presetName: '27" 1440p Monitor',
};
