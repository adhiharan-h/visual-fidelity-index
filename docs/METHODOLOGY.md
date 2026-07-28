# VFI Methodology

> Visual Fidelity Index — Complete Formula Derivation, Scientific Basis, and Limitations

---

## 1. The Problem With PPI

Pixels Per Inch (PPI) is the most commonly cited display quality metric in consumer marketing. It describes the physical density of pixels on the screen surface.

**PPI tells you nothing about sharpness.**

Sharpness is a perceptual property — it depends on how large each pixel appears to your eye, which is a function of both the pixel's physical size *and* how far away you're sitting.

A 10 PPI billboard at 200 feet looks sharp. A 400 PPI phone screen at 2 inches might be so dense that pixels are physically invisible. PPI alone cannot distinguish these cases.

---

## 2. The Physical Basis: Visual Angle

The relevant quantity is the **angular subtense** of a single pixel — how many degrees of arc one pixel occupies in your field of view.

For a pixel of linear size `p` (in inches) at viewing distance `d` (in inches):

```
angular_subtense = 2 × arctan(p / (2 × d))   [degrees]
```

For small angles (which applies to all normal display viewing distances):

```
angular_subtense ≈ p / d   [radians]   or equivalently   (180/π) × p/d   [degrees]
```

---

## 3. Pixels Per Degree (PPD)

The inverse of angular subtense gives us **Pixels Per Degree (PPD)** — how many pixels fit within one degree of visual arc:

```
PPD = d / p = d × PPI × (π/180)
```

Using the exact formulation (preferred):

```
PPD = 2 × d × PPI × tan(0.5°)
```

Where `tan(0.5°) = 0.008727` is the tangent of half a degree (since pixels are divided evenly above and below the 1° arc).

This is the core formula used by VFI.

---

## 4. Effective PPI with Display Scaling

Modern operating systems apply **display scaling** (HiDPI / Retina mode) which renders the UI at a lower logical resolution and upscales it. This means the effective pixel density the rendering engine uses is lower than the physical PPI.

```
Effective_PPI = Physical_PPI / scale_factor
```

Examples:
- A 4K monitor at 200% Windows scaling renders as 1080p → `Eff.PPI = PPI / 2`
- A MacBook Pro M3 at 2× Retina renders at half its native PPI → `Eff.PPI = PPI / 2`
- A 1080p monitor at 100% → `Eff.PPI = PPI`

VFI uses Effective_PPI in all calculations.

---

## 5. The VFI Score

VFI normalises PPD to 100 at the human visual acuity limit of **60 cycles per degree (CPD)**:

```
VFI = (PPD / 60) × 100
```

**Why 60 CPD?**

60 cycles per degree is the widely accepted limit of human foveal visual acuity under optimal conditions:
- Young adult (20s–30s) with 20/20 corrected vision
- High contrast stimulus (black on white)
- Optimal lighting conditions
- Direct fixation (not peripheral vision)

This corresponds to resolving lines separated by 1 arcminute (1/60 of a degree), which is the definition of 20/20 vision.

**References:**
- ISO 9241-303:2011 — Ergonomics of human-system interaction: Requirements for electronic visual displays
- Merrill, D.W. (1957). Visual resolution and acuity. Journal of the Optical Society of America.
- Campbell, F.W. & Robson, J.G. (1968). Application of Fourier analysis to the visibility of gratings. Journal of Physiology.

---

## 6. VFI Score Tiers

| VFI Range | Tier | Perceptual Reality |
|---|---|---|
| < 33 | Pixelated | Individual pixels are clearly visible |
| 33–55 | Low Fidelity | Visible pixel structure in text and fine detail |
| 55–75 | Standard | Acceptable for video; text may appear slightly soft |
| 75–100 | High Fidelity | Pixels very hard to see; excellent for all uses |
| 100–133 | Retina Grade | Exceeds average human acuity limit |
| > 133 | Overkill | Beyond the biological limit of human vision |

---

## 7. Confidence Interval

Viewing distance is not perfectly constant during use. We propagate an assumed ±3 inch uncertainty in viewing distance through the PPD formula using the partial derivative:

```
∂PPD/∂d = 2 × Eff.PPI × tan(0.5°)

σ_PPD = (∂PPD/∂d) × σ_d = 2 × 3 × Eff.PPI × tan(0.5°)

σ_VFI = (σ_PPD / 60) × 100
```

The displayed confidence interval is `VFI ± σ_VFI`.

---

## 8. Optimal Distance

Given a display (with known Eff.PPI), we can solve for the maximum distance at which a target PPD is achieved:

```
d_optimal = target_PPD / (2 × Eff.PPI × tan(0.5°))
```

For target_PPD = 60 (the Retina threshold), this gives the minimum distance at which the display achieves VFI 100.

---

## 9. Horizontal vs. Vertical PPD

For non-square displays, horizontal and vertical PPI differ. The aspect angle `θ = arctan(H/W)` splits the diagonal PPI:

```
PPI_h = W / (screen_size × cos(θ))
PPI_v = H / (screen_size × sin(θ))

PPD_h = 2 × d × PPI_h / scale × tan(0.5°)
PPD_v = 2 × d × PPI_v / scale × tan(0.5°)
```

For standard 16:9 displays the difference is small (~5%). For ultrawides or portrait displays it is more significant.

---

## 10. Known Limitations

### 10.1 Static geometry only

VFI models the physical geometry of pixel density and viewing angle. It does not model:
- Subpixel rendering (ClearType, FreeType)
- Anti-aliasing
- Text hinting
- LCD filter effects

These can make displays appear sharper or blurrier than VFI predicts at a given PPD.

### 10.2 Single-threshold acuity

60 CPD is the peak foveal acuity of a healthy young adult under optimal conditions. Real-world effective acuity varies:

| Group | Approximate CPD |
|---|---|
| Young adult, 20/20, optimal lighting | 50–60 |
| Average adult | 30–45 |
| Older adult (60+) | 20–35 |
| Low-contrast conditions | 15–30 |

The 60 CPD threshold is therefore conservative. For most users, VFI 75 is perceptually indistinguishable from VFI 100.

### 10.3 No refresh rate component

VFI does not model temporal resolution. At high refresh rates (144Hz, 240Hz), motion clarity improves significantly even at the same spatial PPD. A 1080p 240Hz display may provide a better gaming experience than a 1440p 60Hz display, which VFI cannot capture.

### 10.4 No colour accuracy component

sRGB, DCI-P3, and Rec. 2020 colour gamuts are not modelled. VFI is purely a spatial acuity metric.

### 10.5 Diagonal PPI assumption

VFI assumes uniform pixel density across the screen (which is true for all modern displays). OLED screens with PenTile subpixel layouts have lower effective chroma resolution than luma resolution; this is not modelled.

---

## 11. What VFI Is Not

VFI does not claim to be a complete display quality metric. It answers one question precisely:

> **"At my typical viewing distance, will I be able to see individual pixels on this display?"**

For a more complete picture, consider also:
- Colour accuracy (ΔE measurements)
- HDR capability and peak brightness (nits)
- Refresh rate and response time (for gaming)
- Viewing angle (IPS vs. VA vs. OLED)
- Local dimming and contrast ratio

---

## 12. Contributing to the Methodology

If you have:
- Research supporting different acuity thresholds
- Evidence that the formula should be adjusted for specific display types
- Peer-reviewed literature we should cite

Please open a GitHub issue or pull request with references. All methodology changes are discussed publicly before being adopted.

---

*Last updated: 2025 · Version 2.0*
