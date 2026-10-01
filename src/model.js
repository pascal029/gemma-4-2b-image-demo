// Page-side handle to the model. The heavy work runs in model.worker.js so the UI stays responsive.
import { MODEL_ID, DTYPE, CACHE_KEY } from "./config.js";

const worker = new Worker(new URL("./model.worker.js", import.meta.url), {
  type: "module",
});
const pending = new Map();
let nextId = 0;
let loaded = false;
// GPU power preference the loaded model was created with; fixed until reload.
export let loadedPower;

worker.onmessage = ({ data: { id, kind, value } }) => {
  const request = pending.get(id);
  if (!request) return;
  if (kind === "done") {
    pending.delete(id);
    request.resolve();
  } else if (kind === "error") {
    pending.delete(id);
    request.reject(new Error(value));
  } else {
    request.onEvent?.(kind, value);
  }
};

// Fires if the worker script fails to load or throws outside a request.
worker.onerror = (event) => {
  for (const request of pending.values())
    request.reject(new Error(event.message || "The model worker crashed."));
  pending.clear();
};

function call(type, payload, onEvent, transfer = []) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject, onEvent });
    worker.postMessage({ id, type, payload }, transfer);
  });
}

export const isLoaded = () => loaded;

export async function isCached() {
  try {
    const keys = await (await caches.open(CACHE_KEY)).keys();
    return keys.some(
      (request) =>
        request.url.includes(MODEL_ID) &&
        request.url.includes(`decoder_model_merged_${DTYPE}.onnx_data`),
    );
  } catch {
    return false;
  }
}

export async function deleteCachedModel() {
  await caches.delete(CACHE_KEY);
}

// saveToCache false: download into memory only, nothing is written to Cache Storage.
export async function loadModel({ power, saveToCache = true, onProgress }) {
  await call("load", { power, saveToCache }, (kind, value) => {
    if (kind === "progress") onProgress?.(value);
  });
  loaded = true;
  loadedPower = power;
}

export async function analyze({ canvas, text, preset, onChunk }) {
  const { data, width, height } = canvas
    .getContext("2d")
    .getImageData(0, 0, canvas.width, canvas.height);
  // Transfer the pixel buffer instead of copying it.
  await call(
    "analyze",
    { image: { data, width, height }, text, preset },
    (kind, value) => {
      if (kind === "chunk") onChunk?.(value);
    },
    [data.buffer],
  );
}
