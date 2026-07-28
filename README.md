# Visual Fidelity Index (VFI)

> **An open, vendor-neutral standard for measuring display sharpness as humans actually experience it.**

[![Open Standard](https://img.shields.io/badge/standard-open-blue)](docs/METHODOLOGY.md)
[![No Affiliates](https://img.shields.io/badge/affiliates-none-green)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## What is VFI?

Most people buy displays based on **PPI (Pixels Per Inch)** — but PPI ignores the most important factor: **how far away you sit**.

VFI measures **Pixels Per Degree (PPD)** — the angular resolution your eyes actually perceive at your real viewing distance — and normalises it to 100 at the limit of human visual acuity (60 CPD).

```
PPD = 2 × viewing_distance × effective_PPI × tan(0.5°)
VFI = (PPD / 60) × 100
```

**VFI 100** means pixels are at the very threshold of human vision.
**VFI 85** means pixels are very hard to see.
**VFI 56** means visible pixel structure in text.

---

## Features

- **Live calculator** — Enter your resolution, screen size, and viewing distance
- **Display scaling** — Corrects for HiDPI/Retina OS scaling (1×, 1.5×, 2×)
- **Confidence intervals** — Shows ±VFI based on real viewing distance variation
- **Optimal distance** — Tells you how far to sit for Retina-grade sharpness
- **Side-by-side comparator** — Compare two displays head-to-head
- **Distance slider** — Drag to simulate moving closer or farther live
- **35+ device database** — Real devices, searchable, filterable, sortable
- **Open methodology** — Full formula derivation, citations, and caveats

---

## Project Structure

```
vfi/
├── index.html              # Main HTML
├── README.md               # This file
├── LICENSE                 # MIT
├── .gitignore
├── package.json            # Dev scripts (no dependencies)
│
├── assets/
│   ├── css/
│   │   ├── tokens.css      # All design tokens (CSS variables)
│   │   ├── base.css        # Reset, body, container, shared utilities
│   │   ├── navbar.css      # Navigation bar
│   │   ├── hero.css        # Hero section with animated background
│   │   ├── calculator.css  # Main calculator inputs and results
│   │   ├── comparator.css  # Side-by-side comparator section
│   │   ├── database.css    # Device database table
│   │   ├── science.css     # Science/methodology section
│   │   ├── footer.css      # Footer
│   │   └── components.css  # Tooltip, toast (shared UI)
│   │
│   └── js/
│       ├── main.js         # Entry point — wires everything together
│       ├── formula.js      # Pure math — all VFI formula functions
│       ├── state.js        # Shared application state
│       ├── ui.js           # Shared UI utilities (toast, tooltip, navbar)
│       ├── calculator.js   # Calculator logic + actions
│       ├── comparator.js   # Comparator panel logic
│       ├── database.js     # Device DB rendering + filtering
│       └── devices.js      # Device data (pure data, easy to extend)
│
└── docs/
    └── METHODOLOGY.md      # Full formula derivation and scientific references
```

---

## Running Locally

No build step required. Just serve the directory over HTTP:

```bash
# Option 1: npm (via package.json)
npm run dev

# Option 2: Python (built-in)
python3 -m http.server 8765

# Option 3: Node
npx serve . -p 8765
```

Then open **http://localhost:8765** in your browser.

> ⚠ **Important**: You must use a local server (not `file://`). ES modules
> require HTTP due to CORS restrictions on `file://` origins.

---

## Adding Devices

Edit [`assets/js/devices.js`](assets/js/devices.js) and append an entry following the existing schema:

```js
{ name: 'My Monitor 27" 1440p', cat: 'monitor', w: 2560, h: 1440, size: 27, typicalDist: 24 }
```

Categories: `'monitor'` · `'laptop'` · `'phone'` · `'tv'`

Please verify specs against the manufacturer's official product page before submitting a pull request.

---

## The Formula

See [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for the full derivation, references, and known limitations.

**Short version:**

| Step | Formula | What it means |
|---|---|---|
| 1 | `PPI = √(W² + H²) / screen_size` | Physical pixel density |
| 2 | `Eff.PPI = PPI / scale` | After OS display scaling |
| 3 | `PPD = 2 × dist × Eff.PPI × tan(0.5°)` | Angular resolution |
| 4 | `VFI = (PPD / 60) × 100` | Normalised to human acuity limit |

---

## Philosophy

- **No affiliate links** — ever
- **No paywalls** — the calculator is free, forever
- **No tracking** — zero analytics, zero cookies
- **Open methodology** — anyone can audit, critique, and improve the formula
- **No proprietary claims** — VFI is offered as a public good

---

## Contributing

1. Fork the repository
2. Make your changes
3. Open a pull request with a clear description

For methodology changes, please include a reference or rationale in the PR description.

---

## License

MIT — see [LICENSE](LICENSE).

---

## Acknowledgements

- Human visual acuity research: ISO 9241-303
- Display engineering community for widespread adoption of PPD in reviews
- Everyone who challenged the 60 CPD assumption — the caveats section exists because of you
