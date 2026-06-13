"use strict";

/* ============================================================
   Mix It! — a kids' color mixing app
   Colors mix like PAINT using Spectral.js (Kubelka–Munk pigment
   mixing), so blue + yellow = a vivid, natural green.
   ============================================================ */

/* ---------- Color helpers ---------- */

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/* Pick a readable text color (dark or light) for a given background */
function readableInk(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#2a2140" : "#ffffff";
}

/* ---------- Mix two colors like paint (Spectral.js) ----------
   weight is the share of color B, from 0 (all A) to 1 (all B).
   0.5 is an even 50/50 mix. Returns a "#RRGGBB" string. */
function mixColors(hexA, hexB, weight = 0.5) {
  const w = Math.max(0, Math.min(1, weight));
  const a = new spectral.Color(hexA);
  const b = new spectral.Color(hexB);
  return spectral.mix([a, 1 - w], [b, w]).toString();
}

/* ============================================================
   UI
   ============================================================ */

const SWATCHES = [
  "#ff1744", // red (rosy — mixes to a believable purple with blue)
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

const weightSlider = document.getElementById("weightSlider");
const pctA = document.getElementById("pctA");
const pctB = document.getElementById("pctB");
const dotA = document.getElementById("dotA");
const dotB = document.getElementById("dotB");

const backdrop = document.getElementById("pickerBackdrop");
const swatchGrid = document.getElementById("swatchGrid");
const nativePicker = document.getElementById("nativePicker");
const closePicker = document.getElementById("closePicker");

let activeTarget = null; // "A" or "B"
let hasMixed = false; // becomes true after the first MIX IT! press

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

/* Slider value (0..100) as a 0..1 share of color B */
function currentWeight() {
  return weightSlider.value / 100;
}

/* Reflect the slider + chosen colors: percentages, end dots, track gradient */
function updateWeightUI() {
  const w = currentWeight();
  pctA.textContent = Math.round((1 - w) * 100) + "%";
  pctB.textContent = Math.round(w * 100) + "%";

  const colA = state.A || "#dddddd";
  const colB = state.B || "#bbbbbb";
  dotA.style.background = colA;
  dotB.style.background = colB;
  weightSlider.style.setProperty("--colA", colA);
  weightSlider.style.setProperty("--colB", colB);
}

/* Render the mixed result. animate=true plays the pop animation. */
function renderResult(animate) {
  if (!state.A || !state.B) return;
  const mixed = mixColors(state.A, state.B, currentWeight());
  result.style.background = mixed;
  result.style.color = readableInk(mixed);
  result.innerHTML = "<span>= " + mixed.toUpperCase() + "</span>";
  if (animate) {
    result.classList.remove("show");
    void result.offsetWidth; // restart animation
    result.classList.add("show");
  }
  hasMixed = true;
}

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
  updateWeightUI();
  // If a result is already showing, keep it in sync with the new color.
  if (hasMixed) renderResult(false);
}

areaA.addEventListener("click", () => openPicker("A"));
areaB.addEventListener("click", () => openPicker("B"));
closePicker.addEventListener("click", closePickerOverlay);
backdrop.addEventListener("click", (e) => {
  if (e.target === backdrop) closePickerOverlay();
});
nativePicker.addEventListener("input", (e) => applyColor(e.target.value));

// Moving the slider updates the labels, and live-updates the result if shown.
weightSlider.addEventListener("input", () => {
  updateWeightUI();
  if (hasMixed) renderResult(false);
});

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
  renderResult(true);

  mixBtn.classList.remove("pop");
  void mixBtn.offsetWidth;
  mixBtn.classList.add("pop");
});

// Initialize the weight UI on load.
updateWeightUI();

/* ---------- Register the service worker for offline / install ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      /* offline support is a nice-to-have; ignore failures */
    });
  });
}
