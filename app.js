"use strict";

/* ============================================================
   Mix It! — a kids' color mixing app
   Colors mix like PAINT (RYB), so blue + yellow = green.
   ============================================================ */

/* ---------- Color helpers ---------- */

function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  const to2 = (v) => clamp255(v).toString(16).padStart(2, "0");
  return "#" + to2(r) + to2(g) + to2(b);
}

/* ---------- RYB <-> RGB (Gosset & Chen trilinear interpolation) ----------
   This is what makes the mixing feel like real paint:
   blue + yellow -> green, red + blue -> purple, etc.
   Reference: Gosset & Chen, "Paint Inspired Color Mixing and Compositing
   for Visualization". */

// The 8 corners of the RYB cube expressed as RGB (0..1).
const RYB_CUBE = [
  [1.0, 1.0, 1.0], // 000  white
  [1.0, 0.0, 0.0], // 100  red
  [1.0, 1.0, 0.0], // 010  yellow
  [1.0, 0.5, 0.0], // 110  orange
  [0.163, 0.373, 0.6], // 001  blue
  [0.5, 0.0, 0.5], // 101  red + blue   = purple
  [0.0, 0.66, 0.2], // 011  yellow + blue = green
  [0.2, 0.094, 0.0], // 111  black/brown
];

function trilerp(corners, r, y, b) {
  // corners: array of 8 values for one channel, ordered by index = R + 2Y + 4B
  const c00 = corners[0] + (corners[1] - corners[0]) * r;
  const c01 = corners[2] + (corners[3] - corners[2]) * r;
  const c10 = corners[4] + (corners[5] - corners[4]) * r;
  const c11 = corners[6] + (corners[7] - corners[6]) * r;
  const c0 = c00 + (c01 - c00) * y;
  const c1 = c10 + (c11 - c10) * y;
  return c0 + (c1 - c0) * b;
}

function rybToRgb(r, y, b) {
  const red = trilerp(RYB_CUBE.map((c) => c[0]), r, y, b);
  const green = trilerp(RYB_CUBE.map((c) => c[1]), r, y, b);
  const blue = trilerp(RYB_CUBE.map((c) => c[2]), r, y, b);
  return { r: red * 255, g: green * 255, b: blue * 255 };
}

// Invert rybToRgb numerically (small gradient-free search).
// RGB -> RYB by minimizing the difference over the RYB cube.
function rgbToRyb(r, g, b) {
  const target = [r / 255, g / 255, b / 255];
  let best = { r: 0, y: 0, b: 0 };
  let bestErr = Infinity;

  // Coarse then fine search — cheap and plenty accurate for mixing.
  const search = (r0, r1, y0, y1, b0, b1, steps) => {
    const stepR = (r1 - r0) / steps;
    const stepY = (y1 - y0) / steps;
    const stepB = (b1 - b0) / steps;
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= steps; j++) {
        for (let k = 0; k <= steps; k++) {
          const rr = r0 + stepR * i;
          const yy = y0 + stepY * j;
          const bb = b0 + stepB * k;
          const out = rybToRgb(rr, yy, bb);
          const err =
            (out.r / 255 - target[0]) ** 2 +
            (out.g / 255 - target[1]) ** 2 +
            (out.b / 255 - target[2]) ** 2;
          if (err < bestErr) {
            bestErr = err;
            best = { r: rr, y: yy, b: bb };
          }
        }
      }
    }
  };

  search(0, 1, 0, 1, 0, 1, 10);
  const d = 0.1;
  search(
    Math.max(0, best.r - d), Math.min(1, best.r + d),
    Math.max(0, best.y - d), Math.min(1, best.y + d),
    Math.max(0, best.b - d), Math.min(1, best.b + d),
    10
  );
  return best;
}

/* ---------- Boost saturation a touch so mixes look vivid for kids ---------- */
function boostSaturation(r, g, b, factor) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  // pull each channel away from the gray (luminance) point
  return {
    r: l + (r - l) * factor,
    g: l + (g - l) * factor,
    b: l + (b - l) * factor,
  };
}

/* ---------- Mix two colors like paint ---------- */
function mixColors(hexA, hexB) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const ra = rgbToRyb(a.r, a.g, a.b);
  const rb = rgbToRyb(b.r, b.g, b.b);
  const mixed = rybToRgb(
    (ra.r + rb.r) / 2,
    (ra.y + rb.y) / 2,
    (ra.b + rb.b) / 2
  );
  const vivid = boostSaturation(mixed.r, mixed.g, mixed.b, 1.3);
  return rgbToHex(vivid.r, vivid.g, vivid.b);
}

/* ---------- Pick a readable text color for a background ---------- */
function readableInk(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#2a2140" : "#ffffff";
}

/* ============================================================
   UI
   ============================================================ */

const SWATCHES = [
  "#e53935", // red
  "#fb8c00", // orange
  "#fdd835", // yellow
  "#43a047", // green
  "#1e88e5", // blue
  "#8e24aa", // purple
  "#ec407a", // pink
  "#8d6e63", // brown
  "#000000", // black
  "#ffffff", // white
  "#00acc1", // teal
  "#7cb342", // lime
];

const state = { A: null, B: null };

const areaA = document.getElementById("areaA");
const areaB = document.getElementById("areaB");
const mixBtn = document.getElementById("mixBtn");
const result = document.getElementById("result");

const backdrop = document.getElementById("pickerBackdrop");
const swatchGrid = document.getElementById("swatchGrid");
const nativePicker = document.getElementById("nativePicker");
const closePicker = document.getElementById("closePicker");

let activeTarget = null; // "A" or "B"

/* Build the swatch grid once */
SWATCHES.forEach((color) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "swatch";
  btn.style.background = color;
  btn.setAttribute("aria-label", "color " + color);
  btn.addEventListener("click", () => applyColor(color));
  swatchGrid.appendChild(btn);
});

function openPicker(target) {
  activeTarget = target;
  const current = state[target];
  if (current) nativePicker.value = current;
  backdrop.hidden = false;
}

function closePickerOverlay() {
  backdrop.hidden = true;
  activeTarget = null;
}

function applyColor(hex) {
  if (!activeTarget) return;
  state[activeTarget] = hex;
  const area = activeTarget === "A" ? areaA : areaB;
  area.style.background = hex;
  area.classList.add("filled");
  closePickerOverlay();
}

areaA.addEventListener("click", () => openPicker("A"));
areaB.addEventListener("click", () => openPicker("B"));
closePicker.addEventListener("click", closePickerOverlay);
backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) closePickerOverlay();
});
nativePicker.addEventListener("input", (e) => applyColor(e.target.value));

mixBtn.addEventListener("click", () => {
  if (!state.A || !state.B) {
    // Nudge the user to pick both colors first.
    const missing = !state.A ? areaA : areaB;
    missing.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }],
      { duration: 300 }
    );
    return;
  }
  const mixed = mixColors(state.A, state.B);
  result.style.background = mixed;
  result.style.color = readableInk(mixed);
  result.innerHTML = "<span>= " + mixed.toUpperCase() + "</span>";
  result.classList.remove("show");
  void result.offsetWidth; // restart animation
  result.classList.add("show");

  mixBtn.classList.remove("pop");
  void mixBtn.offsetWidth;
  mixBtn.classList.add("pop");
});

/* ---------- Register the service worker for offline / install ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      /* offline support is a nice-to-have; ignore failures */
    });
  });
}
