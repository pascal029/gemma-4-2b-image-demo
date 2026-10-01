import { NEED_DISK } from "./config.js";
import { reqList, reqNote, confirmBtn } from "./dom.js";

const gb = (bytes) => `${(bytes / 1e9).toFixed(1)} GB`;

// Minimum requirements. hard: blocks download/load; soft: warning only.
export async function checkRequirements({ needDisk, power, video }) {
  const adapter = await navigator.gpu?.requestAdapter({ powerPreference: power });
  const results = [{ name: "WebGPU", hard: true, ok: !!adapter, detail: adapter ? "Available" : "Not available in this browser" }];
  if (adapter) {
    const f16 = adapter.features.has("shader-f16");
    results.push({ name: "GPU 16-bit support", hard: true, ok: f16, detail: f16 ? "shader-f16 supported" : "shader-f16 missing, required by this model" });
    const maxBuffer = adapter.limits.maxBufferSize;
    results.push({ name: "GPU buffer limit", hard: false, ok: maxBuffer >= 1e9, detail: `${gb(maxBuffer)} (1 GB+ recommended)` });
  }
  const memory = navigator.deviceMemory; // Chrome-only, capped at 8, randomized by Brave
  results.push({
    name: "Memory", hard: false, ok: memory === undefined ? null : memory >= 8,
    detail: memory === undefined ? "Not reported by this browser (8 GB recommended)" : `Browser reports ~${memory} GB (8 GB recommended; may be approximate)`,
  });
  if (needDisk) {
    const { quota = 0, usage = 0 } = (await navigator.storage?.estimate?.()) ?? {};
    // Brave always reports a fixed 2 GiB quota (anti-fingerprinting), not the real free space.
    const hidden = !!navigator.brave || quota === 2 ** 31;
    results.push(hidden
      ? { name: "Free storage", hard: false, ok: null, detail: `Your browser hides free space, so it can't be checked (${gb(NEED_DISK)} needed)` }
      : { name: "Free storage", hard: true, ok: quota - usage >= NEED_DISK, detail: `${gb(quota - usage)} available to this site (${gb(NEED_DISK)} needed)` });
  }
  results.push({ name: "Camera", hard: true, ok: !!video.srcObject, detail: "Connected" });
  const failed = results.filter((req) => req.hard && req.ok === false).map((req) => req.name);
  return { results, failed, blocked: failed.length > 0 };
}

// Render a check into the download modal and gate its Download button.
export function showRequirements({ results, blocked }) {
  reqList.innerHTML = results.map((req) => {
    const [cls, icon] = req.ok ? ["ok", "✓"] : req.hard && req.ok === false ? ["fail", "✕"] : ["warn", "!"];
    return `<li><span class="icon ${cls}">${icon}</span><span>${req.name}</span><small>${req.detail}</small></li>`;
  }).join("");
  confirmBtn.disabled = blocked;
  reqNote.className = `reqs-note${blocked ? " fail" : ""}`;
  reqNote.textContent = blocked
    ? "Your device doesn't meet the minimum requirements above."
    : "Use Wi-Fi. Warnings won't block the download, but the model may run slowly or fail.";
}
