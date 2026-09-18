import test from 'node:test';
import assert from 'node:assert/strict';

// Set up minimal mock DOM environment before importing modules
class MockClassList {
    constructor() {
        this.classes = new Set();
    }
    add(...cls) { cls.forEach(c => this.classes.add(c)); }
    remove(...cls) { cls.forEach(c => this.classes.delete(c)); }
    toggle(cls, force) {
        if (force === true) {
            this.classes.add(cls);
            return true;
        } else if (force === false) {
            this.classes.delete(cls);
            return false;
        }
        if (this.classes.has(cls)) {
            this.classes.delete(cls);
            return false;
        } else {
            this.classes.add(cls);
            return true;
        }
    }
    contains(cls) { return this.classes.has(cls); }
}

class MockElement {
    constructor(id = '', tagName = 'div', dataset = {}) {
        this.id = id;
        this.tagName = tagName;
        this.dataset = { ...dataset };
        this.value = '';
        this.textContent = '';
        this.innerHTML = '';
        this.attributes = new Map();
        this.classList = new MockClassList();
        this.style = {
            setProperty: (k, v) => { this.style[k] = v; },
            getProperty: (k) => this.style[k]
        };
    }
    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.get(k); }
    removeAttribute(k) { this.attributes.delete(k); }
}

// Registry of elements
const elementRegistry = new Map();
function getOrCreate(id, tag = 'div', dataset = {}) {
    if (!elementRegistry.has(id)) {
        elementRegistry.set(id, new MockElement(id, tag, dataset));
    }
    return elementRegistry.get(id);
}

// Populate known IDs
const knownIds = [
    'width', 'height', 'size', 'dist', 'dist-slider', 'sizeUnit', 'distUnit', 'sizeMetricHint',
    'vfiScore', 'scoreTier', 'scoreMessage', 'scoreConfidence', 'ringFill', 'spectrumNeedle', 'spectrumLabel',
    'ppdVal', 'ppiVal', 'effWorkspaceVal', 'effPpiSub', 'ppdVert', 'optimalDist', 'optimalHint',
    'mathPPI', 'mathEffPPI', 'mathPPD', 'mathVFI', 'mathConf', 'mathPanel', 'mathToggleBtn',
    'compNameA', 'compScoreA', 'compTierA', 'compBarA', 'compPPDA', 'compPPIA',
    'cw', 'ch', 'cs', 'cd', 'compNameB', 'compScoreB', 'compTierB', 'compBarB', 'compPPDB', 'compPPIB',
    'compVerdict', 'dbDistLabel', 'dbDistToggleLabel', 'tierLegend'
];

knownIds.forEach(id => getOrCreate(id));

// Set initial input values
getOrCreate('width').value = '2560';
getOrCreate('height').value = '1440';
getOrCreate('size').value = '27';
getOrCreate('dist').value = '24';
getOrCreate('dist-slider').value = '24';
getOrCreate('cw').value = '1920';
getOrCreate('ch').value = '1080';
getOrCreate('cs').value = '24';
getOrCreate('cd').value = '24';

// Mock tier legend items
const tierLegendItems = [
    new MockElement('', 'div', { tierCls: 'theme-pixelated' }),
    new MockElement('', 'div', { tierCls: 'theme-low' }),
    new MockElement('', 'div', { tierCls: 'theme-standard' }),
    new MockElement('', 'div', { tierCls: 'theme-high' }),
    new MockElement('', 'div', { tierCls: 'theme-retina' }),
    new MockElement('', 'div', { tierCls: 'theme-overkill' })
];

// Mock preset buttons
const presetNames = [
    '14" 1080p Laptop', '24" 1080p', '27" 1440p', '27" 4K', '32" 4K',
    'iPhone 15 Pro Max', 'MacBook Pro 14"', '65" 4K TV', '55" 1080p TV', 'Surface Laptop 5'
];
const presetButtons = presetNames.map(name => {
    const el = new MockElement('', 'button', { preset: name });
    el.textContent = name;
    return el;
});

// Mock scale buttons
const scaleButtons = [1, 1.25, 1.5, 2].map(sc => {
    const el = new MockElement('', 'button', { scale: sc.toString() });
    el.textContent = `${sc}×`;
    return el;
});

// Mock unit buttons
const unitButtons = ['in', 'cm'].map(u => {
    const el = new MockElement('', 'button', { unit: u });
    el.textContent = u;
    return el;
});

// Mock dist chips
const distChips = [
    { role: 'Phone', distIn: 12 },
    { role: 'Desk', distIn: 24 },
    { role: 'Deep Desk', distIn: 32 },
    { role: 'TV', distIn: 84 }
].map(c => {
    const el = new MockElement('', 'button', { distIn: c.distIn.toString(), role: c.role });
    el.textContent = `${c.role} (${c.distIn}")`;
    return el;
});

// Mock results panel
const calcResultsPanel = new MockElement('', 'div');

// Global mock DOM
globalThis.window = {
    location: new URL('https://visualfidelityindex.com/'),
    history: { replaceState: () => {} }
};

let _animTime = 1000;
globalThis.requestAnimationFrame = (cb) => {
    _animTime += 500;
    cb(_animTime);
    return 1;
};
globalThis.cancelAnimationFrame = () => {};

globalThis.document = {
    getElementById: (id) => elementRegistry.get(id) || null,
    querySelector: (sel) => {
        if (sel === '.calc-results-panel') return calcResultsPanel;
        if (sel.startsWith('#')) return elementRegistry.get(sel.slice(1)) || null;
        return null;
    },
    querySelectorAll: (sel) => {
        if (sel === '.tier-legend-item') return tierLegendItems;
        if (sel === '.preset-btn') return presetButtons;
        if (sel === '.scale-btn') return scaleButtons;
        if (sel === '.unit-btn') return unitButtons;
        if (sel === '.dist-chip') return distChips;
        return [];
    }
};

test('--- INTEGRATION & WORKFLOW STRESS TEST ---', async (t) => {
    // Dynamically import modules now that global document/window are ready
    const { state } = await import('../assets/js/state.js');
    const { calculate, setPreset, setScale, setUnit, setQuickDist } = await import('../assets/js/calculator.js');
    const { calcComparatorB } = await import('../assets/js/comparator.js');

    await t.test('1. Initial Default State Calculation', () => {
        calculate(false);
        const score = parseFloat(getOrCreate('vfiScore').textContent);
        const tier = getOrCreate('scoreTier').textContent;
        const activeLegend = tierLegendItems.filter(item => item.classList.contains('active'));

        assert.equal(score, 76, '27" 1440p @ 24" should score 76 VFI');
        assert.equal(tier, 'HIGH FIDELITY');
        assert.equal(activeLegend.length, 1, 'Exactly one tier legend item must be active');
        assert.equal(activeLegend[0].dataset.tierCls, 'theme-high');
        assert.equal(getOrCreate('effWorkspaceVal').textContent, '2560×1440');
        assert.equal(getOrCreate('effPpiSub').textContent, 'Native (1:1 pixel grid)');
    });

    await t.test('2. 32" 4K Preset Activation & Legend Sync', () => {
        setPreset(3840, 2160, 32, 26, 1, '32" 4K');
        const score = parseFloat(getOrCreate('vfiScore').textContent);
        const tier = getOrCreate('scoreTier').textContent;
        const activeLegend = tierLegendItems.filter(item => item.classList.contains('active'));

        assert.equal(score, 104, '32" 4K @ 26" should score 104 VFI');
        assert.equal(tier, 'RETINA GRADE');
        assert.equal(activeLegend.length, 1, 'Exactly one tier legend item must be active');
        assert.equal(activeLegend[0].dataset.tierCls, 'theme-retina');
        assert.equal(getOrCreate('effWorkspaceVal').textContent, '3840×2160');
        assert.equal(getOrCreate('effPpiSub').textContent, 'Native (1:1 pixel grid)');

        // Preset button highlight
        const activePreset = presetButtons.find(b => b.classList.contains('active'));
        assert.ok(activePreset, 'A preset button must be active');
        assert.equal(activePreset.dataset.preset, '32" 4K');
    });

    await t.test('3. Scaling Transitions on 32" 4K', () => {
        // Test 1.25x scaling: 4% fractional penalty drops 104.1 VFI to 99.97 VFI (<100 = HIGH FIDELITY)
        setScale(1.25);
        assert.equal(state.scale, 1.25);
        assert.equal(getOrCreate('effWorkspaceVal').textContent, '3072×1728');
        assert.equal(getOrCreate('effPpiSub').textContent, '1.25× HiDPI (138 PPI native)');
        let score = parseFloat(getOrCreate('vfiScore').textContent);
        assert.equal(score, 100, '32" 4K at 1.25x scaling rounds to 100 VFI');
        let activeLegend = tierLegendItems.filter(item => item.classList.contains('active'));
        assert.equal(activeLegend[0].dataset.tierCls, 'theme-high', '99.97 VFI correctly classifies into High Fidelity');

        // Test 1.5x scaling: 3% fractional penalty gives 101.0 VFI (>=100 = RETINA GRADE)
        setScale(1.5);
        assert.equal(state.scale, 1.5);
        assert.equal(getOrCreate('effWorkspaceVal').textContent, '2560×1440');
        assert.equal(getOrCreate('effPpiSub').textContent, '1.5× HiDPI (138 PPI native)');
        score = parseFloat(getOrCreate('vfiScore').textContent);
        assert.equal(score, 101, '32" 4K at 1.5x scaling scores 101 VFI');
        activeLegend = tierLegendItems.filter(item => item.classList.contains('active'));
        assert.equal(activeLegend[0].dataset.tierCls, 'theme-retina');

        // Test 2x scaling: integer scaling retains 100% vector clarity (104 VFI = RETINA GRADE)
        setScale(2);
        assert.equal(state.scale, 2);
        assert.equal(getOrCreate('effWorkspaceVal').textContent, '1920×1080');
        assert.equal(getOrCreate('effPpiSub').textContent, '2× HiDPI (138 PPI native)');
        score = parseFloat(getOrCreate('vfiScore').textContent);
        assert.equal(score, 104, '32" 4K at 2x scaling retains full 104 VFI native vector sharpness');
        activeLegend = tierLegendItems.filter(item => item.classList.contains('active'));
        assert.equal(activeLegend[0].dataset.tierCls, 'theme-retina');

        // Reset to 1x
        setScale(1);
    });

    await t.test('4. Full Spectrum Sweep Across All 6 Tiers on Legend', () => {
        // Pixelated: 24" 1080p from 10 inches
        getOrCreate('width').value = '1920';
        getOrCreate('height').value = '1080';
        getOrCreate('size').value = '24';
        getOrCreate('dist').value = '10';
        getOrCreate('dist-slider').value = '10';
        calculate(false);
        assert.equal(getOrCreate('scoreTier').textContent, 'PIXELATED');
        let active = tierLegendItems.filter(item => item.classList.contains('active'));
        assert.equal(active[0].dataset.tierCls, 'theme-pixelated');

        // Low: 24" 1080p from 16 inches
        getOrCreate('dist').value = '16';
        getOrCreate('dist-slider').value = '16';
        calculate(false);
        assert.equal(getOrCreate('scoreTier').textContent, 'LOW FIDELITY');
        active = tierLegendItems.filter(item => item.classList.contains('active'));
        assert.equal(active[0].dataset.tierCls, 'theme-low');

        // Standard: 24" 1080p from 24 inches
        getOrCreate('dist').value = '24';
        getOrCreate('dist-slider').value = '24';
        calculate(false);
        assert.equal(getOrCreate('scoreTier').textContent, 'STANDARD');
        active = tierLegendItems.filter(item => item.classList.contains('active'));
        assert.equal(active[0].dataset.tierCls, 'theme-standard');

        // High: 27" 1440p from 24 inches
        getOrCreate('width').value = '2560';
        getOrCreate('height').value = '1440';
        getOrCreate('size').value = '27';
        getOrCreate('dist').value = '24';
        getOrCreate('dist-slider').value = '24';
        calculate(false);
        assert.equal(getOrCreate('scoreTier').textContent, 'HIGH FIDELITY');
        active = tierLegendItems.filter(item => item.classList.contains('active'));
        assert.equal(active[0].dataset.tierCls, 'theme-high');

        // Retina: 27" 4K from 24 inches
        getOrCreate('width').value = '3840';
        getOrCreate('height').value = '2160';
        getOrCreate('size').value = '27';
        getOrCreate('dist').value = '24';
        getOrCreate('dist-slider').value = '24';
        calculate(false);
        assert.equal(getOrCreate('scoreTier').textContent, 'RETINA GRADE');
        active = tierLegendItems.filter(item => item.classList.contains('active'));
        assert.equal(active[0].dataset.tierCls, 'theme-retina');

        // Overkill: 27" 4K from 40 inches
        getOrCreate('dist').value = '40';
        getOrCreate('dist-slider').value = '40';
        calculate(false);
        assert.equal(getOrCreate('scoreTier').textContent, 'OVERKILL');
        active = tierLegendItems.filter(item => item.classList.contains('active'));
        assert.equal(active[0].dataset.tierCls, 'theme-overkill');
    });

    await t.test('5. Unit Switching (Inches <-> Centimeters) Cycle Stability', () => {
        // Set to 27" 1440p @ 24"
        setPreset(2560, 1440, 27, 24, 1, '27" 1440p');
        assert.equal(state.dist, 24);

        // Switch to CM
        setUnit('cm');
        assert.equal(state.unit, 'cm');
        assert.equal(getOrCreate('distUnit').textContent, 'cm');
        assert.equal(getOrCreate('dist').value, 61); // 24 * 2.54 = 60.96 -> 61 cm

        // Score should remain consistent
        let score = parseFloat(getOrCreate('vfiScore').textContent);
        assert.ok(Math.abs(score - 76) <= 1, `Score in cm mode should be ~76, got ${score}`);

        // Switch back to IN
        setUnit('in');
        assert.equal(state.unit, 'in');
        assert.equal(getOrCreate('distUnit').textContent, 'in');
        score = parseFloat(getOrCreate('vfiScore').textContent);
        assert.equal(score, 76);
    });

    await t.test('6. Comparator Panel B Integration with New Scaling', () => {
        // Display A is 27" 1440p @ 24" -> VFI 76
        // Display B is 24" 1080p @ 24"
        getOrCreate('cw').value = '1920';
        getOrCreate('ch').value = '1080';
        getOrCreate('cs').value = '24';
        getOrCreate('cd').value = '24';
        calcComparatorB();

        const bScore = parseFloat(getOrCreate('compScoreB').textContent);
        const bTier = getOrCreate('compTierB').textContent;
        assert.equal(bScore, 64);
        assert.equal(bTier, 'STANDARD');

        const verdict = getOrCreate('compVerdict').innerHTML;
        assert.ok(verdict.includes('noticeably sharper') || verdict.includes('sharper'), `Verdict must reflect difference: ${verdict}`);
    });

    await t.test('7. Rapid Sequence Stress Test (500 state transitions)', () => {
        const testPresets = [
            [1920, 1080, 14, 18, 1, '14" 1080p Laptop'],
            [1920, 1080, 24, 22, 1, '24" 1080p'],
            [2560, 1440, 27, 24, 1, '27" 1440p'],
            [3840, 2160, 27, 24, 1, '27" 4K'],
            [3840, 2160, 32, 26, 1, '32" 4K'],
            [3024, 1964, 14.2, 18, 1, 'MacBook Pro 14"']
        ];
        const testScales = [1, 1.25, 1.5, 2];

        for (let i = 0; i < 500; i++) {
            const p = testPresets[i % testPresets.length];
            setPreset(p[0], p[1], p[2], p[3], p[4], p[5]);

            const sc = testScales[i % testScales.length];
            setScale(sc);

            const score = parseFloat(getOrCreate('vfiScore').textContent);
            const activeLegend = tierLegendItems.filter(item => item.classList.contains('active'));

            assert.ok(!isNaN(score) && isFinite(score) && score > 0, `Run ${i}: score is invalid (${score})`);
            assert.equal(activeLegend.length, 1, `Run ${i}: exactly 1 tier legend item must be active, got ${activeLegend.length}`);
            assert.ok(getOrCreate('effWorkspaceVal').textContent.includes('×'), `Run ${i}: effWorkspaceVal invalid`);
        }
    });
});
