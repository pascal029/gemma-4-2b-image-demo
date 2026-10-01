import { PRESETS } from "./config.js";
import { isLoaded, loadedPower } from "./model.js";

let perf = "balanced";
try {
  const saved = localStorage.getItem("perf");
  if (saved in PRESETS) perf = saved;
} catch {}

const listeners = [];

export const currentPreset = () => PRESETS[perf];
export const onPerfChange = (listener) => listeners.push(listener);

// Fill a <fieldset class="perf"> with Low / Balanced / High radios.
export function mountPerf(fieldset, name) {
  fieldset.innerHTML = `<legend>Performance</legend><div class="perf-opts">${Object.entries(
    PRESETS,
  )
    .map(
      ([key, preset]) =>
        `<label><input type="radio" name="${name}" value="${key}"> ${preset.label}</label>`,
    )
    .join("")}</div><small></small>`;
  fieldset.onchange = (event) => setPerf(event.target.value);
}

// Sync every perf control on the page, remember the choice, and notify listeners.
export function setPerf(key = perf) {
  perf = key;
  try {
    localStorage.setItem("perf", key);
  } catch {}
  const preset = PRESETS[key];
  const hint =
    `${preset.power ?? "default"} GPU · image detail ${preset.tokens} tokens · answers up to ${preset.maxNew} tokens` +
    (isLoaded() && preset.power !== loadedPower
      ? " · GPU preference applies after reload"
      : "");
  for (const fieldset of document.querySelectorAll(".perf")) {
    fieldset.querySelector(`input[value="${key}"]`).checked = true;
    fieldset.querySelector("small").textContent = hint;
  }
  for (const listener of listeners) listener(preset);
}
