(() => {
  // assets/js/state.js
  var state = {
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
    useCase: "balanced",
    /** Human-readable name of the currently loaded preset */
    presetName: '27" 1440p Monitor'
  };

  // assets/js/formula.js
  var TAN_HALF_DEG = Math.tan(0.5 * Math.PI / 180);
  var RETINA_PPD = 60;
  var DIST_UNCERTAINTY_IN = 3;
  var RING_CIRCUMFERENCE = 2 * Math.PI * 85;
  function computePPI(w, h, size) {
    return Math.sqrt(w * w + h * h) / size;
  }
  function computePPD(dist, ppi) {
    return 2 * dist * ppi * TAN_HALF_DEG;
  }
  function computeEffectivePPD(dist, ppi, ppiH, ppiV, useCase = "balanced") {
    const ppd = computePPD(dist, ppi);
    const ppdH = computePPD(dist, ppiH);
    const ppdV = computePPD(dist, ppiV);
    switch (useCase) {
      case "text":
        return ppdH;
      case "design":
        return Math.min(ppdH, ppdV);
      case "video":
        return ppdV;
      case "gaming":
      case "balanced":
      default:
        return ppd;
    }
  }
  function computeVFI(ppd) {
    return ppd / RETINA_PPD * 100;
  }
  function computeConfidence(ppi) {
    const sigmaPPD = 2 * DIST_UNCERTAINTY_IN * ppi * TAN_HALF_DEG;
    return sigmaPPD / RETINA_PPD * 100;
  }
  function computeOptimalDist(ppi, targetPPD = RETINA_PPD) {
    return targetPPD / (2 * ppi * TAN_HALF_DEG);
  }
  function computePPIHV(w, h, size) {
    const aspect = Math.atan2(h, w);
    return {
      ppiH: w / (size * Math.cos(aspect)),
      ppiV: h / (size * Math.sin(aspect))
    };
  }
  function getTier(vfi) {
    if (vfi < 33) return { name: "PIXELATED", cls: "theme-pixelated", badge: "tier-pixelated", msg: "Individual pixels are clearly visible. Not ideal for text-heavy work at this distance." };
    if (vfi < 55) return { name: "LOW FIDELITY", cls: "theme-low", badge: "tier-low", msg: "Visible pixel structure in text and fine detail. Consider sitting farther back or upgrading." };
    if (vfi < 75) return { name: "STANDARD", cls: "theme-standard", badge: "tier-std", msg: "Acceptable for video and casual use. Text may appear slightly soft on close inspection." };
    if (vfi < 100) return { name: "HIGH FIDELITY", cls: "theme-high", badge: "tier-high", msg: "Pixels are very hard to see at this distance. Excellent for all uses." };
    if (vfi < 133) return { name: "RETINA GRADE", cls: "theme-retina", badge: "tier-retina", msg: "Exceeds the average human acuity limit. Zero visible pixelation at this distance." };
    return { name: "OVERKILL", cls: "theme-overkill", badge: "tier-over", msg: "Beyond the biological limit of human vision. Extra pixels provide no perceptual benefit." };
  }
  function getTierColor(cls) {
    const map = {
      "theme-pixelated": "#ef4444",
      "theme-low": "#f97316",
      "theme-standard": "#eab308",
      "theme-high": "#22c55e",
      "theme-retina": "#6366f1",
      "theme-overkill": "#a855f7"
    };
    return map[cls] ?? "#6366f1";
  }

  // assets/js/ui.js
  var _animFrames = {};
  function animateNum(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const current = parseInt(el.textContent, 10) || 0;
    if (current === target) return;
    if (_animFrames[id]) cancelAnimationFrame(_animFrames[id]);
    const start = performance.now();
    const duration = 400;
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(current + (target - current) * ease);
      if (t < 1) {
        _animFrames[id] = requestAnimationFrame(step);
      } else {
        el.textContent = target;
        delete _animFrames[id];
      }
    }
    _animFrames[id] = requestAnimationFrame(step);
  }
  var _toastTimer = null;
  function showToast(msg, duration = 3e3) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => toast.classList.remove("show"), duration);
  }
  function setupTooltips() {
    const tooltip = document.getElementById("tooltip");
    if (!tooltip) return;
    document.querySelectorAll("[data-tip]").forEach((el) => {
      const show = (e) => {
        tooltip.textContent = el.dataset.tip;
        tooltip.classList.add("visible");
        _positionTooltip(e);
      };
      el.addEventListener("mouseenter", show);
      el.addEventListener("mousemove", _positionTooltip);
      el.addEventListener("mouseleave", () => tooltip.classList.remove("visible"));
      el.addEventListener("focus", show);
      el.addEventListener("blur", () => tooltip.classList.remove("visible"));
    });
  }
  function _positionTooltip(e) {
    const tooltip = document.getElementById("tooltip");
    if (!tooltip) return;
    const x = e.clientX + 14;
    const y = e.clientY + 14;
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    tooltip.style.left = `${Math.min(x, window.innerWidth - tw - 8)}px`;
    tooltip.style.top = `${Math.min(y, window.innerHeight - th - 8)}px`;
  }
  function setupNavbar() {
    const navbar = document.getElementById("navbar");
    if (!navbar) return;
    window.addEventListener("scroll", () => {
      navbar.classList.toggle("scrolled", window.scrollY > 20);
    }, { passive: true });
  }
  function setupHamburger() {
    const btn = document.getElementById("navHamburger");
    const menu = document.getElementById("navMobileMenu");
    if (!btn || !menu) return;
    function toggle(forceClose = false) {
      const willOpen = forceClose ? false : !menu.classList.contains("open");
      menu.classList.toggle("open", willOpen);
      btn.classList.toggle("open", willOpen);
      btn.setAttribute("aria-expanded", willOpen);
      btn.setAttribute("aria-label", willOpen ? "Close navigation menu" : "Open navigation menu");
    }
    btn.addEventListener("click", () => toggle());
    menu.querySelectorAll(".nav-mobile-link").forEach((link) => {
      link.addEventListener("click", () => toggle(true));
    });
    document.addEventListener("click", (e) => {
      const navbar = document.getElementById("navbar");
      if (navbar && !navbar.contains(e.target)) toggle(true);
    }, { passive: true });
  }

  // assets/js/comparator.js
  var _scores = { A: NaN, B: NaN };
  function updateComparatorA(vfi, tier, ppdH, ppi) {
    _scores.A = vfi;
    _setPanel("A", vfi, tier, ppdH, ppi);
    _updateVerdict();
  }
  function calcComparatorB() {
    const w = parseFloat(document.getElementById("cw").value);
    const h = parseFloat(document.getElementById("ch").value);
    const size = parseFloat(document.getElementById("cs").value);
    const dist = parseFloat(document.getElementById("cd").value);
    if (!w || !h || !size || !dist || w < 1 || h < 1 || size < 1 || dist < 1) return;
    const sc = state.scale;
    const ppi = computePPI(w, h, size);
    const effPPI = ppi / sc;
    const ppd = computePPD(dist, effPPI);
    const vfi = computeVFI(ppd);
    const tier = getTier(vfi);
    _scores.B = vfi;
    _setPanel("B", vfi, tier, ppd, ppi);
    _updateVerdict();
  }
  function _setPanel(id, vfi, tier, ppd, ppi) {
    const suffix = id;
    document.getElementById(`compScore${suffix}`).textContent = Math.round(vfi);
    document.getElementById(`compTier${suffix}`).textContent = tier.name;
    const bar = document.getElementById(`compBar${suffix}`);
    bar.style.width = `${Math.min(vfi / 150 * 100, 100)}%`;
    bar.style.background = getTierColor(tier.cls);
    document.getElementById(`compPPD${suffix}`).textContent = `${Math.round(ppd)} PPD`;
    document.getElementById(`compPPI${suffix}`).textContent = `${Math.round(ppi)} PPI`;
  }
  function _updateVerdict() {
    const aScore = _scores.A;
    const bScore = _scores.B;
    const verdict = document.getElementById("compVerdict");
    if (isNaN(aScore) || isNaN(bScore)) return;
    const diff = Math.abs(aScore - bScore);
    const winner = aScore > bScore ? "A" : bScore > aScore ? "B" : null;
    if (!winner) {
      verdict.textContent = "Both displays are perceptually identical at these settings.";
    } else {
      const nameA = document.getElementById("compNameA").textContent || "Display A";
      const nameB = document.getElementById("compNameB")?.value || "Display B";
      const winnerName = winner === "A" ? nameA : nameB;
      const loserName = winner === "A" ? nameB : nameA;
      const significance = diff < 5 ? "practically identical (below perceptual threshold)" : diff < 15 ? "marginally sharper" : diff < 30 ? "noticeably sharper" : "significantly sharper";
      verdict.textContent = `${winnerName} is ${significance} than ${loserName} at your viewing distances (\u0394${Math.round(diff)} VFI).`;
    }
    verdict.classList.add("has-result");
  }

  // assets/js/devices.js
  var DEVICES = [
    // ---- Monitors ----
    { name: 'Dell U2723QE 27" 4K', cat: "monitor", w: 3840, h: 2160, size: 27, typicalDist: 24 },
    { name: 'LG 27GN800 27" 1440p 144Hz', cat: "monitor", w: 2560, h: 1440, size: 27, typicalDist: 24 },
    { name: 'ASUS PA278QV 27" 1440p', cat: "monitor", w: 2560, h: 1440, size: 27, typicalDist: 24 },
    { name: 'BenQ EW2480 24" 1080p', cat: "monitor", w: 1920, h: 1080, size: 24, typicalDist: 22 },
    { name: 'Generic 27" 1080p', cat: "monitor", w: 1920, h: 1080, size: 27, typicalDist: 24 },
    { name: 'Samsung Odyssey G7 32" 1440p', cat: "monitor", w: 2560, h: 1440, size: 32, typicalDist: 26 },
    { name: 'LG 32UN880 32" 4K', cat: "monitor", w: 3840, h: 2160, size: 32, typicalDist: 26 },
    { name: 'ASUS ROG PG279QM 27" 1440p', cat: "monitor", w: 2560, h: 1440, size: 27, typicalDist: 24 },
    { name: 'AOC U28G2X 28" 4K', cat: "monitor", w: 3840, h: 2160, size: 28, typicalDist: 24 },
    { name: 'Alienware AW3423DW 34" QD-OLED', cat: "monitor", w: 3440, h: 1440, size: 34, typicalDist: 28 },
    { name: 'LG 34WP85C 34" UltraWide 1440p', cat: "monitor", w: 3440, h: 1440, size: 34, typicalDist: 28 },
    { name: 'LG 27GP850 27" 1440p 165Hz', cat: "monitor", w: 2560, h: 1440, size: 27, typicalDist: 24 },
    // ---- Laptops ----
    { name: 'MacBook Pro 14" M3 Pro', cat: "laptop", w: 3024, h: 1964, size: 14.2, typicalDist: 18 },
    { name: 'MacBook Pro 16" M3 Pro', cat: "laptop", w: 3456, h: 2234, size: 16.2, typicalDist: 20 },
    { name: 'MacBook Air 13" M2', cat: "laptop", w: 2560, h: 1664, size: 13.6, typicalDist: 18 },
    { name: "Dell XPS 13 OLED", cat: "laptop", w: 3456, h: 2160, size: 13.4, typicalDist: 18 },
    { name: "ThinkPad X1 Carbon Gen 11", cat: "laptop", w: 2880, h: 1800, size: 14, typicalDist: 18 },
    { name: 'Surface Laptop 5 13.5"', cat: "laptop", w: 2256, h: 1504, size: 13.5, typicalDist: 18 },
    { name: "ASUS ZenBook 14 OLED", cat: "laptop", w: 2880, h: 1800, size: 14, typicalDist: 18 },
    { name: 'Budget Laptop 15" 768p', cat: "laptop", w: 1366, h: 768, size: 15.6, typicalDist: 20 },
    { name: 'HP Spectre x360 14"', cat: "laptop", w: 2560, h: 1600, size: 14, typicalDist: 18 },
    // ---- Phones ----
    { name: "iPhone 15 Pro Max", cat: "phone", w: 2796, h: 1290, size: 6.7, typicalDist: 14 },
    { name: "iPhone 15", cat: "phone", w: 2556, h: 1179, size: 6.1, typicalDist: 14 },
    { name: "Samsung Galaxy S24 Ultra", cat: "phone", w: 3088, h: 1440, size: 6.8, typicalDist: 14 },
    { name: "Google Pixel 8 Pro", cat: "phone", w: 2992, h: 1344, size: 6.7, typicalDist: 14 },
    { name: 'OnePlus 12 6.82"', cat: "phone", w: 3168, h: 1440, size: 6.82, typicalDist: 14 },
    { name: "Samsung Galaxy A54", cat: "phone", w: 2340, h: 1080, size: 6.4, typicalDist: 14 },
    // ---- TVs ----
    { name: 'LG C3 55" OLED 4K', cat: "tv", w: 3840, h: 2160, size: 55, typicalDist: 72 },
    { name: 'LG C3 65" OLED 4K', cat: "tv", w: 3840, h: 2160, size: 65, typicalDist: 84 },
    { name: 'Sony Bravia XR 55" 4K', cat: "tv", w: 3840, h: 2160, size: 55, typicalDist: 72 },
    { name: 'Samsung QN90C 65" 4K', cat: "tv", w: 3840, h: 2160, size: 65, typicalDist: 84 },
    { name: 'Generic 55" 1080p TV', cat: "tv", w: 1920, h: 1080, size: 55, typicalDist: 72 },
    { name: 'TCL 65" 4K Roku TV', cat: "tv", w: 3840, h: 2160, size: 65, typicalDist: 84 },
    { name: 'LG 75" 4K NanoCell', cat: "tv", w: 3840, h: 2160, size: 75, typicalDist: 96 },
    { name: 'Samsung 32" Full HD (bedroom)', cat: "tv", w: 1920, h: 1080, size: 32, typicalDist: 48 }
  ];

  // assets/js/database.js
  var _category = "all";
  var _sortCol = "vfi";
  var _sortAsc = false;
  function renderDB() {
    const dist = state.dist;
    const searchInput = document.getElementById("dbSearch");
    const query = searchInput ? searchInput.value.toLowerCase() : "";
    const tbody = document.getElementById("dbBody");
    if (!tbody) return;
    const rows = DEVICES.filter((d) => _category === "all" || d.cat === _category).filter((d) => !query || d.name.toLowerCase().includes(query)).map((d) => {
      const ppi = computePPI(d.w, d.h, d.size);
      const ppd = computePPD(dist, ppi);
      const vfi = computeVFI(ppd);
      const tier = getTier(vfi);
      return { ...d, ppi, ppd, vfi, tier };
    }).sort((a, b) => {
      const mult = _sortAsc ? 1 : -1;
      let av = a[_sortCol];
      let bv = b[_sortCol];
      if (_sortCol === "res") {
        av = a.w * a.h;
        bv = b.w * b.h;
      }
      if (typeof av === "string") return av.localeCompare(bv) * mult;
      return (av - bv) * mult;
    });
    tbody.innerHTML = rows.map((d) => `
        <tr
            data-w="${d.w}"
            data-h="${d.h}"
            data-size="${d.size}"
            data-dist="${d.typicalDist}"
            data-name="${_esc(d.name)}"
            role="button"
            tabindex="0"
            aria-label="Load ${_esc(d.name)} into calculator">
            <td class="device-name">${_esc(d.name)}</td>
            <td>${d.w}\xD7${d.h}</td>
            <td>${d.size}"</td>
            <td>${Math.round(d.ppi)}</td>
            <td class="vfi-num" style="color:${getTierColor(d.tier.cls)}">${Math.round(d.vfi)}</td>
            <td><span class="tier-badge ${d.tier.badge}">${d.tier.name}</span></td>
        </tr>
    `).join("");
    _updateHeaderSortIcons();
  }
  function filterDB(cat) {
    _category = cat;
    document.querySelectorAll(".db-filter").forEach((b) => {
      b.classList.toggle("active", b.dataset.cat === cat);
    });
    renderDB();
  }
  function sortDB(col) {
    _sortAsc = _sortCol === col ? !_sortAsc : false;
    _sortCol = col;
    renderDB();
  }
  function loadDevice(w, h, size, dist, name) {
    setPreset(w, h, size, dist, state.scale, name);
    document.getElementById("calculator").scrollIntoView({ behavior: "smooth" });
    showToast(`Loaded: ${name}`);
  }
  function _updateHeaderSortIcons() {
    const headers = document.querySelectorAll("#dbTable th[data-sort]");
    headers.forEach((th) => {
      const col = th.dataset.sort;
      const isCurrent = col === _sortCol;
      th.classList.toggle("active-sort", isCurrent);
      const arrow = isCurrent ? _sortAsc ? " \u2191" : " \u2193" : "";
      th.setAttribute("aria-sort", isCurrent ? _sortAsc ? "ascending" : "descending" : "none");
      const baseName = th.dataset.label || th.textContent.replace(/[↑↓]/g, "").trim();
      th.dataset.label = baseName;
      th.textContent = baseName + arrow;
    });
  }
  function _esc(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // assets/js/calculator.js
  function calculate() {
    const w = parseFloat(document.getElementById("width").value);
    const h = parseFloat(document.getElementById("height").value);
    const size = parseFloat(document.getElementById("size").value);
    const dist = parseFloat(document.getElementById("dist").value);
    const sc = state.scale;
    if (!w || !h || !size || !dist || w < 1 || h < 1 || size < 1 || dist < 1) return;
    Object.assign(state, { w, h, size, dist });
    const ppi = computePPI(w, h, size);
    const effPPI = ppi / sc;
    const { ppiH, ppiV } = computePPIHV(w, h, size);
    const ppdH = computePPD(dist, ppiH / sc);
    const ppdV = computePPD(dist, ppiV / sc);
    const activePPD = computeEffectivePPD(dist, effPPI, ppiH / sc, ppiV / sc, state.useCase);
    const vfi = computeVFI(activePPD);
    const conf = computeConfidence(effPPI);
    const optDist = computeOptimalDist(effPPI);
    const tier = getTier(vfi);
    animateNum("vfiScore", Math.round(vfi));
    document.getElementById("scoreTier").textContent = tier.name;
    document.getElementById("scoreMessage").textContent = tier.msg;
    document.getElementById("scoreConfidence").textContent = `${Math.round(vfi - conf)}\u2013${Math.round(vfi + conf)} (\xB1${Math.round(conf)} at \xB13" distance variation)`;
    _updateRing(vfi, tier);
    _updateSpectrum(vfi);
    animateNum("ppdVal", Math.round(ppdH));
    document.getElementById("ppdVert").textContent = `${Math.round(ppdV)} vertical`;
    animateNum("ppiVal", Math.round(ppi));
    animateNum("effPpiVal", Math.round(effPPI));
    document.getElementById("effPpiSub").textContent = sc !== 1 ? `After ${sc}\xD7 scaling` : "Native (no scaling)";
    document.getElementById("optimalDist").textContent = `${Math.round(optDist)}"`;
    document.getElementById("optimalHint").textContent = optDist <= dist ? "You're past Retina threshold!" : `Sit \u2264${Math.round(optDist)}" for Retina grade`;
    _updateMathPanel(w, h, size, dist, ppi, effPPI, sc, activePPD, vfi, conf);
    _updateTheme(tier.cls);
    updateComparatorA(vfi, tier, ppdH, ppi);
    const slider = document.getElementById("dist-slider");
    if (slider && Math.abs(parseFloat(slider.value) - dist) > 0.5) slider.value = dist;
    const dbDistLabel = document.getElementById("dbDistLabel");
    if (dbDistLabel) dbDistLabel.textContent = `${dist}"`;
    renderDB();
  }
  function _updateRing(vfi, tier) {
    const pct = Math.min(vfi / 150, 1);
    const offset = RING_CIRCUMFERENCE * (1 - pct);
    const ring = document.getElementById("ringFill");
    if (!ring) return;
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = getTierColor(tier.cls);
  }
  function _updateSpectrum(vfi) {
    const pct = Math.min(Math.max(vfi / 150, 0), 1) * 100;
    const needle = document.getElementById("spectrumNeedle");
    const label = document.getElementById("spectrumLabel");
    if (needle) needle.style.left = `${pct}%`;
    if (label) {
      label.style.left = `${pct}%`;
      label.textContent = Math.round(vfi);
    }
  }
  function _updateTheme(cls) {
    const panel = document.querySelector(".calc-results-panel");
    if (!panel) return;
    panel.className = `calc-panel calc-results-panel ${cls}`;
  }
  function _updateMathPanel(w, h, size, dist, ppi, effPPI, sc, activePPD, vfi, conf) {
    const mathPPI = document.getElementById("mathPPI");
    const mathEffPPI = document.getElementById("mathEffPPI");
    const mathPPD = document.getElementById("mathPPD");
    const mathVFI = document.getElementById("mathVFI");
    const mathConf = document.getElementById("mathConf");
    if (mathPPI) mathPPI.textContent = `PPI = \u221A(${w}\xB2 + ${h}\xB2) / ${size} = ${ppi.toFixed(1)} px/in`;
    if (mathEffPPI) mathEffPPI.textContent = `Eff.PPI = ${ppi.toFixed(1)} / ${sc} = ${effPPI.toFixed(1)} px/in`;
    if (mathPPD) mathPPD.textContent = `PPD (${state.useCase}) = ${activePPD.toFixed(1)}`;
    if (mathVFI) mathVFI.textContent = `VFI = (${activePPD.toFixed(1)} / 60) \xD7 100 = ${vfi.toFixed(1)}`;
    const sigPPD = 2 * 3 * effPPI * Math.tan(0.5 * Math.PI / 180);
    if (mathConf) mathConf.textContent = `\u03C3_PPD = 2 \xD7 3 \xD7 ${effPPI.toFixed(1)} \xD7 tan(0.5\xB0) = ${sigPPD.toFixed(1)} \u2192 \xB1${conf.toFixed(0)} VFI`;
  }
  function setPreset(w, h, s, d, sc = 1, name = "") {
    document.getElementById("width").value = w;
    document.getElementById("height").value = h;
    document.getElementById("size").value = s;
    document.getElementById("dist").value = d;
    document.getElementById("dist-slider").value = d;
    state.presetName = name || `${w}\xD7${h} / ${s}"`;
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      const presetAttr = btn.dataset.preset || btn.textContent.trim();
      const active = presetAttr === name || btn.textContent.trim() === name;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    state.scale = sc;
    document.querySelectorAll(".scale-btn").forEach((btn) => {
      btn.classList.toggle("active", parseFloat(btn.dataset.scale) === sc);
    });
    calculate();
  }
  function setScale(sc) {
    state.scale = sc;
    document.querySelectorAll(".scale-btn").forEach((btn) => {
      btn.classList.toggle("active", parseFloat(btn.dataset.scale) === sc);
    });
    calculate();
  }
  function setUseCase(uc) {
    state.useCase = uc;
    document.querySelectorAll(".usecase-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.case === uc);
    });
    const hintEl = document.getElementById("useCaseHint");
    if (hintEl) {
      const hints = {
        balanced: "\u2696 Balanced mode: Evaluated on standard diagonal PPD",
        text: "\u{1F4DD} Text/Code mode: Evaluated on horizontal PPD (critical for text clarity & subpixel rendering)",
        gaming: "\u{1F3AE} Gaming mode: Evaluated on diagonal PPD for dynamic motion & immersion",
        design: "\u{1F3A8} Design mode: Evaluated on worst-axis PPD (ensures precision for fine lines & vectors)",
        video: "\u{1F4FA} Video mode: Evaluated on vertical PPD (16:9 vertical frame resolution)"
      };
      hintEl.textContent = hints[uc] || hints.balanced;
    }
    calculate();
  }
  function toggleMath() {
    const panel = document.getElementById("mathPanel");
    const btn = document.getElementById("mathToggleBtn");
    const isOpen = panel.classList.toggle("open");
    btn.textContent = isOpen ? "Hide the math \u25B4" : "Show the math \u25BE";
    btn.setAttribute("aria-expanded", isOpen);
    panel.setAttribute("aria-hidden", !isOpen);
  }
  function shareResult() {
    const score = document.getElementById("vfiScore").textContent;
    const tier = document.getElementById("scoreTier").textContent;
    const setup = `${state.w}\xD7${state.h} on ${state.size}" screen at ${state.dist}" distance`;
    const text = `My display scored ${score} VFI (${tier}) \u2014 ${setup}. Check yours at VisualFidelityIndex.com`;
    if (navigator.share) {
      navigator.share({ title: "VFI Score", text, url: window.location.href }).catch(() => {
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text}
${window.location.href}`).then(() => showToast("Score copied to clipboard!")).catch(() => showToast("Copy failed \u2014 select and copy manually."));
    } else {
      showToast("Sharing not supported in this browser.");
    }
  }

  // assets/js/main.js
  window.__vfi = {
    setPreset,
    setScale,
    setUseCase,
    toggleMath,
    shareResult,
    filterDB,
    sortDB,
    loadDevice
  };
  function setupListeners() {
    ["width", "height", "size", "dist"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", () => {
          document.querySelectorAll(".preset-btn").forEach((b) => {
            b.classList.remove("active");
            b.setAttribute("aria-pressed", "false");
          });
          state.presetName = "";
          calculate();
        });
      }
    });
    const slider = document.getElementById("dist-slider");
    if (slider) {
      slider.addEventListener("input", (e) => {
        const distInput = document.getElementById("dist");
        if (distInput) distInput.value = e.target.value;
        calculate();
      });
    }
    ["cw", "ch", "cs", "cd"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", calcComparatorB);
    });
    const dbSearch = document.getElementById("dbSearch");
    if (dbSearch) dbSearch.addEventListener("input", renderDB);
    const presetsContainer = document.querySelector(".presets");
    if (presetsContainer) {
      presetsContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".preset-btn");
        if (!btn) return;
        const onclickAttr = btn.getAttribute("onclick");
        if (onclickAttr) {
          const match = onclickAttr.match(/setPreset\((\d+),\s*(\d+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*['"]([^'"]+)['"]\)/);
          if (match) {
            const [, w, h, s, d, sc, name] = match;
            setPreset(parseFloat(w), parseFloat(h), parseFloat(s), parseFloat(d), parseFloat(sc), name);
            return;
          }
        }
        const presetName = btn.dataset.preset || btn.textContent.trim();
        if (presetName === '27" 1440p') setPreset(2560, 1440, 27, 24, 1, '27" 1440p');
        else if (presetName === '27" 1080p') setPreset(1920, 1080, 27, 24, 1, '27" 1080p');
        else if (presetName === '27" 4K') setPreset(3840, 2160, 27, 24, 1, '27" 4K');
        else if (presetName === "iPhone 15 Pro Max" || presetName === "iPhone 15 Pro") setPreset(2796, 1290, 6.7, 14, 3, "iPhone 15 Pro Max");
        else if (presetName.includes("MacBook")) setPreset(3024, 1964, 14.2, 18, 2, 'MacBook Pro 14"');
        else if (presetName.includes("65")) setPreset(3840, 2160, 65, 84, 1, '65" 4K TV');
        else if (presetName.includes("55")) setPreset(1920, 1080, 55, 84, 1, '55" 1080p TV');
        else if (presetName.includes("Surface")) setPreset(2256, 1504, 13.5, 18, 1, "Surface Laptop 5");
      });
    }
    const scaleContainer = document.querySelector(".scale-btns");
    if (scaleContainer) {
      scaleContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".scale-btn");
        if (!btn) return;
        const sc = parseFloat(btn.dataset.scale);
        if (!isNaN(sc)) setScale(sc);
      });
    }
    const usecaseContainer = document.querySelector(".usecase-btns");
    if (usecaseContainer) {
      usecaseContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".usecase-btn");
        if (!btn) return;
        const uc = btn.dataset.case;
        if (uc) setUseCase(uc);
      });
    }
    const mathBtn = document.getElementById("mathToggleBtn");
    if (mathBtn) mathBtn.addEventListener("click", toggleMath);
    const shareBtn = document.querySelector(".share-btn-new");
    if (shareBtn) shareBtn.addEventListener("click", shareResult);
    const filterContainer = document.querySelector(".db-filter-btns");
    if (filterContainer) {
      filterContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".db-filter");
        if (!btn) return;
        const cat = btn.dataset.cat;
        if (cat) filterDB(cat);
      });
    }
    const dbTable = document.getElementById("dbTable");
    if (dbTable) {
      const thead = dbTable.querySelector("thead");
      if (thead) {
        thead.addEventListener("click", (e) => {
          const th = e.target.closest("th[data-sort]");
          if (!th) return;
          const col = th.dataset.sort;
          if (col) sortDB(col);
        });
      }
    }
    const dbBody = document.getElementById("dbBody");
    if (dbBody) {
      dbBody.addEventListener("click", (e) => {
        const tr = e.target.closest("tr[data-w]");
        if (!tr) return;
        const { w, h, size, dist, name } = tr.dataset;
        loadDevice(parseFloat(w), parseFloat(h), parseFloat(size), parseFloat(dist), name);
      });
      dbBody.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          const tr = e.target.closest("tr[data-w]");
          if (!tr) return;
          e.preventDefault();
          const { w, h, size, dist, name } = tr.dataset;
          loadDevice(parseFloat(w), parseFloat(h), parseFloat(size), parseFloat(dist), name);
        }
      });
    }
  }
  function init() {
    setupNavbar();
    setupHamburger();
    setupTooltips();
    setupListeners();
    const ring = document.getElementById("ringFill");
    if (ring) {
      ring.style.strokeDasharray = RING_CIRCUMFERENCE;
      ring.style.strokeDashoffset = RING_CIRCUMFERENCE;
    }
    calculate();
    calcComparatorB();
    renderDB();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
