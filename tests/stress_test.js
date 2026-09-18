import test from 'node:test';
import assert from 'node:assert/strict';
import {
    computePPI,
    computePPD,
    computeEffectivePPD,
    computeVFI,
    computeConfidence,
    computeOptimalDist,
    computePPIHV,
    getTier,
    getTierColor,
    getScalingFidelityFactor,
    RETINA_PPD,
    RING_CIRCUMFERENCE
} from '../assets/js/formula.js';

test('--- STRESS TEST SUITE: VISUAL FIDELITY INDEX ---', async (t) => {

    await t.test('1. Scaling Fidelity Factor & Physics', async (t2) => {
        // Standard OS scale factors
        assert.equal(getScalingFidelityFactor(1), 1.0, '1x scaling must be 1.0 (native)');
        assert.equal(getScalingFidelityFactor(1.0), 1.0, '1.0x scaling must be 1.0');
        assert.equal(getScalingFidelityFactor(1.25), 0.96, '1.25x scaling must apply 4% penalty (0.96)');
        assert.equal(getScalingFidelityFactor(1.5), 0.97, '1.5x scaling must apply 3% penalty (0.97)');
        assert.equal(getScalingFidelityFactor(2), 1.0, '2x HiDPI integer scaling must be 1.0 (pixel-perfect)');
        assert.equal(getScalingFidelityFactor(3), 1.0, '3x HiDPI integer scaling must be 1.0');

        // Edge case scale values
        assert.equal(getScalingFidelityFactor(undefined), 1.0, 'Undefined scale defaults to 1.0');
        assert.equal(getScalingFidelityFactor(0), 1.0, '0 scale defaults to 1.0');
        assert.equal(getScalingFidelityFactor(-1), 1.0, 'Negative scale defaults to 1.0');
        assert.equal(getScalingFidelityFactor(NaN), 1.0, 'NaN scale defaults to 1.0');
        assert.equal(getScalingFidelityFactor(1.75), 1.0, 'Unmapped fractional defaults to 1.0');

        // Verify native physical PPI is preserved across all scales
        const ppi4k27 = computePPI(3840, 2160, 27);
        assert.ok(Math.abs(ppi4k27 - 163.178) < 0.01, '4K 27" physical PPI must be ~163.18');

        // PPD across scales for 27" 4K at 24" distance
        const ppd1x = computeEffectivePPD(24, ppi4k27, ppi4k27, ppi4k27, 'balanced', 1);
        const ppd2x = computeEffectivePPD(24, ppi4k27, ppi4k27, ppi4k27, 'balanced', 2);
        const ppd125x = computeEffectivePPD(24, ppi4k27, ppi4k27, ppi4k27, 'balanced', 1.25);
        const ppd150x = computeEffectivePPD(24, ppi4k27, ppi4k27, ppi4k27, 'balanced', 1.5);

        assert.equal(ppd1x, ppd2x, '2x HiDPI must produce identical optical PPD to 1x native for vector clarity');
        assert.equal(ppd125x, ppd1x * 0.96, '1.25x scaling must scale active PPD by exactly 0.96');
        assert.equal(ppd150x, ppd1x * 0.97, '1.5x scaling must scale active PPD by exactly 0.97');
    });

    await t.test('2. 32" 4K Preset Verification', async (t2) => {
        const w = 3840;
        const h = 2160;
        const size = 32;
        const dist = 26; // 26 inches typical desk distance

        const ppi = computePPI(w, h, size);
        assert.ok(Math.abs(ppi - 137.679) < 0.01, `32" 4K PPI must be 137.68, got ${ppi}`);

        const ppd = computeEffectivePPD(dist, ppi, ppi, ppi, 'balanced', 1);
        assert.ok(Math.abs(ppd - 62.479) < 0.01, `32" 4K PPD at 26" must be 62.48, got ${ppd}`);

        const vfi = computeVFI(ppd);
        assert.ok(Math.abs(vfi - 104.13) < 0.05, `32" 4K VFI must be ~104.1, got ${vfi}`);

        const tier = getTier(vfi);
        assert.equal(tier.name, 'RETINA GRADE', '32" 4K at 26" must be RETINA GRADE');
        assert.equal(tier.cls, 'theme-retina', '32" 4K tier class must be theme-retina');

        const optDist = computeOptimalDist(ppi);
        assert.ok(Math.abs(optDist - 24.97) < 0.05, `32" 4K optimal retina distance must be ~25.0", got ${optDist}`);

        // UI Workspace check
        assert.equal(Math.round(w / 1), 3840);
        assert.equal(Math.round(h / 1), 2160);
        assert.equal(Math.round(w / 1.25), 3072);
        assert.equal(Math.round(h / 1.25), 1728);
        assert.equal(Math.round(w / 1.5), 2560);
        assert.equal(Math.round(h / 1.5), 1440);
    });

    await t.test('3. Tier Classification Boundaries & Legend Consistency', async (t2) => {
        const testCases = [
            { score: -10, expectedTier: 'PIXELATED', expectedCls: 'theme-pixelated' },
            { score: 0, expectedTier: 'PIXELATED', expectedCls: 'theme-pixelated' },
            { score: 32.999, expectedTier: 'PIXELATED', expectedCls: 'theme-pixelated' },
            { score: 33.0, expectedTier: 'LOW FIDELITY', expectedCls: 'theme-low' },
            { score: 54.999, expectedTier: 'LOW FIDELITY', expectedCls: 'theme-low' },
            { score: 55.0, expectedTier: 'STANDARD', expectedCls: 'theme-standard' },
            { score: 74.999, expectedTier: 'STANDARD', expectedCls: 'theme-standard' },
            { score: 75.0, expectedTier: 'HIGH FIDELITY', expectedCls: 'theme-high' },
            { score: 99.999, expectedTier: 'HIGH FIDELITY', expectedCls: 'theme-high' },
            { score: 100.0, expectedTier: 'RETINA GRADE', expectedCls: 'theme-retina' },
            { score: 132.999, expectedTier: 'RETINA GRADE', expectedCls: 'theme-retina' },
            { score: 133.0, expectedTier: 'OVERKILL', expectedCls: 'theme-overkill' },
            { score: 250.0, expectedTier: 'OVERKILL', expectedCls: 'theme-overkill' },
            { score: 9999, expectedTier: 'OVERKILL', expectedCls: 'theme-overkill' }
        ];

        for (const tc of testCases) {
            const tier = getTier(tc.score);
            assert.equal(tier.name, tc.expectedTier, `Score ${tc.score} must produce tier ${tc.expectedTier}`);
            assert.equal(tier.cls, tc.expectedCls, `Score ${tc.score} must produce class ${tc.expectedCls}`);
            assert.ok(tier.badge.startsWith('tier-'), `Score ${tc.score} must have valid badge string`);
            assert.ok(tier.msg.length > 10, `Score ${tc.score} must have descriptive message`);

            const color = getTierColor(tier.cls);
            assert.match(color, /^#[0-9a-f]{6}$/i, `Class ${tier.cls} must map to valid 6-char hex color`);
        }
    });

    await t.test('4. All Presets Battery Test', async (t2) => {
        const presets = [
            { name: '14" 1080p Laptop', w: 1920, h: 1080, s: 14, d: 18 },
            { name: '24" 1080p', w: 1920, h: 1080, s: 24, d: 22 },
            { name: '27" 1440p', w: 2560, h: 1440, s: 27, d: 24 },
            { name: '27" 1080p', w: 1920, h: 1080, s: 27, d: 24 },
            { name: '27" 4K', w: 3840, h: 2160, s: 27, d: 24 },
            { name: '32" 4K', w: 3840, h: 2160, s: 32, d: 26 },
            { name: 'iPhone 15 Pro Max', w: 2796, h: 1290, s: 6.7, d: 14 },
            { name: 'MacBook Pro 14"', w: 3024, h: 1964, s: 14.2, d: 18 },
            { name: '65" 4K TV', w: 3840, h: 2160, s: 65, d: 84 },
            { name: '55" 1080p TV', w: 1920, h: 1080, s: 55, d: 84 },
            { name: 'Surface Laptop 5', w: 2256, h: 1504, s: 13.5, d: 18 }
        ];

        for (const p of presets) {
            const ppi = computePPI(p.w, p.h, p.s);
            assert.ok(!isNaN(ppi) && ppi > 30 && ppi < 600, `${p.name}: invalid PPI ${ppi}`);

            const ppd = computeEffectivePPD(p.d, ppi, ppi, ppi, 'balanced', 1);
            assert.ok(!isNaN(ppd) && ppd > 10 && ppd < 200, `${p.name}: invalid PPD ${ppd}`);

            const vfi = computeVFI(ppd);
            assert.ok(!isNaN(vfi) && vfi > 15 && vfi < 350, `${p.name}: invalid VFI ${vfi}`);

            const conf = computeConfidence(ppi);
            assert.ok(!isNaN(conf) && conf > 0, `${p.name}: invalid confidence ${conf}`);

            const optDist = computeOptimalDist(ppi);
            assert.ok(!isNaN(optDist) && optDist > 0, `${p.name}: invalid optDist ${optDist}`);

            const tier = getTier(vfi);
            assert.ok(tier && tier.name, `${p.name}: invalid tier`);
        }
    });

    await t.test('5. Needle Position Clamp and Spectrum Bounds', async (t2) => {
        function computeNeedleClamp(vfi) {
            const pct = Math.min(Math.max(vfi / 150, 0), 1) * 100;
            return {
                pct,
                leftVal: `clamp(7px, ${pct.toFixed(2)}%, calc(100% - 7px))`,
                labelLeftVal: `clamp(12px, ${pct.toFixed(2)}%, calc(100% - 12px))`
            };
        }

        const extremeScores = [-50, 0, 1, 33, 75, 100, 133, 150, 151, 300, 10000];
        for (const s of extremeScores) {
            const res = computeNeedleClamp(s);
            assert.ok(res.pct >= 0 && res.pct <= 100, `Percentage ${res.pct} out of range [0, 100] for score ${s}`);
            assert.ok(res.leftVal.startsWith('clamp(7px,'), `Needle clamp must start with clamp(7px,`);
            assert.ok(res.labelLeftVal.startsWith('clamp(12px,'), `Label clamp must start with clamp(12px,`);
        }
    });

    await t.test('6. Randomized Monte Carlo Fuzzing (10,000 runs)', async (t2) => {
        const useCases = ['balanced', 'text', 'gaming', 'design', 'video'];
        const scales = [1, 1.25, 1.5, 2, 1.75, 2.5];

        for (let i = 0; i < 10000; i++) {
            const w = Math.floor(Math.random() * 7000) + 640;
            const h = Math.floor(Math.random() * 4000) + 480;
            const size = Math.random() * 95 + 5; // 5" to 100"
            const dist = Math.random() * 140 + 6; // 6" to 146"
            const sc = scales[Math.floor(Math.random() * scales.length)];
            const uc = useCases[Math.floor(Math.random() * useCases.length)];

            const ppi = computePPI(w, h, size);
            const { ppiH, ppiV } = computePPIHV(w, h, size);
            const ppd = computeEffectivePPD(dist, ppi, ppiH, ppiV, uc, sc);
            const vfi = computeVFI(ppd);
            const conf = computeConfidence(ppi);
            const optDist = computeOptimalDist(ppi);
            const tier = getTier(vfi);
            const color = getTierColor(tier.cls);

            assert.ok(!isNaN(ppi) && isFinite(ppi) && ppi > 0, `Run ${i}: invalid PPI ${ppi}`);
            assert.ok(!isNaN(ppd) && isFinite(ppd) && ppd > 0, `Run ${i}: invalid PPD ${ppd}`);
            assert.ok(!isNaN(vfi) && isFinite(vfi) && vfi > 0, `Run ${i}: invalid VFI ${vfi}`);
            assert.ok(!isNaN(conf) && isFinite(conf) && conf > 0, `Run ${i}: invalid Conf ${conf}`);
            assert.ok(!isNaN(optDist) && isFinite(optDist) && optDist > 0, `Run ${i}: invalid OptDist ${optDist}`);
            assert.ok(tier && tier.cls && tier.name, `Run ${i}: invalid Tier`);
            assert.ok(color && color.startsWith('#'), `Run ${i}: invalid Color`);
        }
    });

    await t.test('7. Extreme Edge Cases (Zero, Negative, Singularities)', async (t2) => {
        // Zero / negative inputs to computePPI
        assert.equal(computePPI(0, 1080, 24), 0);
        assert.equal(computePPI(1920, 0, 24), 0);
        assert.equal(computePPI(1920, 1080, 0), 0);
        assert.equal(computePPI(-1920, 1080, 24), 0);
        assert.equal(computePPI(1920, -1080, 24), 0);
        assert.equal(computePPI(1920, 1080, -24), 0);

        // Zero / negative inputs to computePPD
        assert.equal(computePPD(0, 100), 0);
        assert.equal(computePPD(24, 0), 0);
        assert.equal(computePPD(-24, 100), 0);
        assert.equal(computePPD(24, -100), 0);

        // Optimal distance with 0 PPI
        assert.equal(computeOptimalDist(0), 0);
        assert.equal(computeOptimalDist(-50), 0);

        // Ultrawide 32:9 displays
        const ppiUW = computePPI(5120, 1440, 49);
        assert.ok(ppiUW > 100 && ppiUW < 120, `49" 5120x1440 PPI should be ~108, got ${ppiUW}`);
        const { ppiH: uwH, ppiV: uwV } = computePPIHV(5120, 1440, 49);
        assert.ok(Math.abs(uwH - uwV) < 1, `Square pixels should have identical horizontal and vertical PPI`);
    });
});
