import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('--- DOM & HTML STRUCTURAL STRESS TEST ---', async (t) => {
    const htmlPath = path.resolve('index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    await t.test('1. Essential Calculator & Metric Elements Exist in HTML', () => {
        const requiredIds = [
            'width',
            'height',
            'size',
            'dist',
            'dist-slider',
            'vfiScore',
            'scoreTier',
            'scoreMessage',
            'scoreConfidence',
            'ringFill',
            'spectrumNeedle',
            'spectrumLabel',
            'tierLegend',
            'ppdVal',
            'ppiVal',
            'optimalDist',
            'optimalHint',
            'effWorkspaceVal',
            'effPpiSub',
            'mathPPI',
            'mathEffPPI',
            'mathPPD',
            'mathVFI',
            'mathConf'
        ];

        for (const id of requiredIds) {
            assert.ok(
                html.includes(`id="${id}"`),
                `index.html must contain element with id="${id}"`
            );
        }
    });

    await t.test('2. Tier Legend Structure & Completeness', () => {
        // Must contain all 6 tiers
        const expectedTiers = [
            'theme-pixelated',
            'theme-low',
            'theme-standard',
            'theme-high',
            'theme-retina',
            'theme-overkill'
        ];

        for (const tierCls of expectedTiers) {
            assert.ok(
                html.includes(`data-tier-cls="${tierCls}"`),
                `index.html tierLegend must contain data-tier-cls="${tierCls}"`
            );
        }

        // Check tier labels
        const expectedNames = ['Pixelated', 'Low', 'Standard', 'High', 'Retina', 'Overkill'];
        for (const name of expectedNames) {
            assert.ok(
                html.includes(`<span class="tier-legend-name">${name}</span>`),
                `index.html tierLegend must contain name "${name}"`
            );
        }

        // Check tier ranges
        const expectedRanges = ['&lt;33', '33–54', '55–74', '75–99', '100–132', '133+'];
        for (const range of expectedRanges) {
            assert.ok(
                html.includes(`<span class="tier-legend-range">${range}</span>`),
                `index.html tierLegend must contain range "${range}"`
            );
        }
    });

    await t.test('3. 32" 4K Preset Button Verification', () => {
        assert.ok(
            html.includes('data-preset="32&quot; 4K"'),
            'index.html must have preset button with data-preset="32&quot; 4K"'
        );
        assert.ok(
            html.includes('>32" 4K</button>'),
            'index.html preset button text must be 32" 4K'
        );
    });

    await t.test('4. Display Scaling Buttons Verification', () => {
        const requiredScales = ['1', '1.25', '1.5', '2'];
        for (const sc of requiredScales) {
            assert.ok(
                html.includes(`data-scale="${sc}"`),
                `index.html must have scale button with data-scale="${sc}"`
            );
        }
    });

    await t.test('5. UI Workspace Metric Card Labels', () => {
        assert.ok(
            html.includes('<div class="metric-name">UI Workspace</div>'),
            '4th metric card must have title "UI Workspace"'
        );
        assert.ok(
            html.includes('id="effWorkspaceVal"'),
            '4th metric card value must have id="effWorkspaceVal"'
        );
        assert.ok(
            html.includes('id="effPpiSub"'),
            '4th metric card subtext must have id="effPpiSub"'
        );
    });

    await t.test('6. CSS Styles for Tier Legend & Spectrum Needle', () => {
        const cssPath = path.resolve('assets/css/calculator.css');
        const css = fs.readFileSync(cssPath, 'utf8');

        assert.ok(css.includes('.tier-legend'), 'CSS must define .tier-legend');
        assert.ok(css.includes('.tier-legend-item'), 'CSS must define .tier-legend-item');
        assert.ok(css.includes('.tier-legend-item.active'), 'CSS must define .tier-legend-item.active');
        assert.ok(css.includes('data-tier-cls="theme-pixelated"'), 'CSS must style theme-pixelated dot');
        assert.ok(css.includes('data-tier-cls="theme-low"'), 'CSS must style theme-low dot');
        assert.ok(css.includes('data-tier-cls="theme-standard"'), 'CSS must style theme-standard dot');
        assert.ok(css.includes('data-tier-cls="theme-high"'), 'CSS must style theme-high dot');
        assert.ok(css.includes('data-tier-cls="theme-retina"'), 'CSS must style theme-retina dot');
        assert.ok(css.includes('data-tier-cls="theme-overkill"'), 'CSS must style theme-overkill dot');

        // Verify needle styling fix
        assert.ok(
            css.includes('left: clamp(7px, var(--needle-pos, 0%), calc(100% - 7px))'),
            'CSS must use clamped left for needle'
        );
    });

    await t.test('7. Compiled styles.css & bundle.js Sync Verification', () => {
        const bundlePath = path.resolve('assets/js/bundle.js');
        const distBundlePath = path.resolve('dist/assets/js/bundle.js');
        const stylesPath = path.resolve('assets/css/styles.css');
        const distStylesPath = path.resolve('dist/assets/css/styles.css');

        const bundle = fs.readFileSync(bundlePath, 'utf8');
        const distBundle = fs.readFileSync(distBundlePath, 'utf8');
        const styles = fs.readFileSync(stylesPath, 'utf8');
        const distStyles = fs.readFileSync(distStylesPath, 'utf8');

        assert.ok(bundle.includes('.96') && bundle.includes('.97'), 'bundle.js must contain scaling factors .96 and .97');
        assert.ok(bundle.includes('effWorkspaceVal'), 'bundle.js must reference effWorkspaceVal');
        assert.ok(bundle.includes('32" 4K') || bundle.includes('32\\" 4K'), 'bundle.js must handle 32" 4K');
        assert.equal(bundle, distBundle, 'assets/js/bundle.js and dist/assets/js/bundle.js must be identical');

        assert.ok(styles.includes('.tier-legend'), 'styles.css must contain .tier-legend');
        assert.equal(styles, distStyles, 'assets/css/styles.css and dist/assets/css/styles.css must be identical');
    });
});
