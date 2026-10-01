// Browser (ONNX) build of google/gemma-4-E2B-it; the google repo is PyTorch-only.
export const MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX";
export const DTYPE = "q4f16";
export const PROMPT = "What is in this photo? Describe it briefly.";

// Cache Storage name for the model files; the worker sets transformers.js `env.cacheKey` to this.
export const CACHE_KEY = "transformers-cache";

// Gemma's recommended sampling settings. do_sample must be true or the others are ignored.
export const SAMPLING = { do_sample: true, temperature: 1.0, top_p: 0.95, top_k: 64 };

// Free storage needed to save the ~3.4 GB of model files.
export const NEED_DISK = 4e9;

// Browsers can't cap GPU %, so presets trade the knobs that actually drive GPU load.
export const PRESETS = {
  low: { label: "Low", power: "low-power", tokens: 70, maxNew: 128 },
  balanced: { label: "Balanced", power: undefined, tokens: 140, maxNew: 256 },
  high: { label: "High", power: "high-performance", tokens: 280, maxNew: 512 },
};
