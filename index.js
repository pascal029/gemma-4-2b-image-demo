import { PROMPT } from "./src/config.js";
import {
  video,
  canvas,
  bar,
  promptBox,
  promptInput,
  perfMain,
  downloadBtn,
  shotBtn,
  retakeBtn,
  analyzeBtn,
  answer,
  deleteBtn,
  modal,
  perfModal,
  storeChk,
  confirmBtn,
  status,
} from "./src/dom.js";
import { startCamera, capturePhoto } from "./src/camera.js";
import {
  isCached,
  isLoaded,
  loadModel,
  deleteCachedModel,
  analyze,
} from "./src/model.js";
import {
  currentPreset,
  mountPerf,
  setPerf,
  onPerfChange,
} from "./src/settings.js";
import { checkRequirements, showRequirements } from "./src/requirements.js";

const READY = "Model ready. Point the camera at something and take a photo.";

const requirements = (needDisk) =>
  checkRequirements({ needDisk, power: currentPreset().power, video });
const refreshRequirements = async () =>
  showRequirements(await requirements(storeChk.checked));

mountPerf(perfModal, "perfModal");
mountPerf(perfMain, "perfMain");
onPerfChange(() => {
  if (modal.open) refreshRequirements();
});
setPerf();

// 1. WebGPU + camera
if (!(await navigator.gpu?.requestAdapter())) {
  status("WebGPU is not supported here. Use a recent Chrome or Edge.");
  throw new Error("no webgpu");
}
status("Please allow camera access…");
try {
  await startCamera(video);
} catch (error) {
  status(`Camera access denied or unavailable: ${error.message}`);
  throw error;
}

// 2. Already downloaded? Load it, else offer the download.
async function startModel(saveToCache) {
  downloadBtn.hidden = true;
  bar.hidden = false;
  try {
    await loadModel({
      power: currentPreset().power,
      saveToCache,
      onProgress: (progress) => {
        bar.value = progress.progress;
        // After the last byte, ONNX Runtime still has to build the sessions and upload weights to the GPU.
        status(
          progress.progress >= 100
            ? "Load model complete. Preparing the model on your GPU, this can take a minute…"
            : `Loading model… ${(progress.loaded / 1e9).toFixed(2)} / ${(progress.total / 1e9).toFixed(2)} GB`,
        );
      },
    });
    shotBtn.disabled = false;
    status(READY);
  } catch (error) {
    downloadBtn.hidden = false;
    status(`Failed to load the model: ${error.message}`);
  }
  bar.hidden = true;
}

if (await isCached()) {
  deleteBtn.hidden = false;
  const check = await requirements(false);
  if (check.blocked) {
    status(
      `Can't load the model, minimum requirements not met: ${check.failed.join(", ")}.`,
    );
  } else {
    status("Model found in cache. Loading…");
    startModel(true);
  }
} else {
  status("Camera ready. Download the model to start.");
  downloadBtn.hidden = false;
}

downloadBtn.onclick = () => {
  confirmBtn.disabled = true;
  modal.showModal();
  refreshRequirements();
};
storeChk.onchange = refreshRequirements;
modal.onclose = async () => {
  if (modal.returnValue !== "ok") return;
  await startModel(storeChk.checked);
  deleteBtn.hidden = !(await isCached());
};

deleteBtn.onclick = async () => {
  if (
    !confirm(
      "Delete the saved model (~3.2 GB) from this browser? You'll need to download it again next visit.",
    )
  )
    return;
  await deleteCachedModel();
  deleteBtn.hidden = true;
  status(
    isLoaded()
      ? "Saved model deleted. It still works until you close or reload this page."
      : "Saved model deleted.",
  );
};

// 3. Take photo: freeze the frame, then let the user edit the prompt
promptInput.value = PROMPT;

shotBtn.onclick = () => {
  capturePhoto(video, canvas);
  video.hidden = true;
  canvas.hidden = false;
  shotBtn.hidden = true;
  promptBox.hidden = false;
  retakeBtn.hidden = false;
  analyzeBtn.hidden = false;
  answer.textContent = "";
  status("Edit the prompt if you like, then press Analyze.");
  promptInput.focus();
};

// 4. Analyze the frozen photo with the user's prompt
const busy = (on) => {
  analyzeBtn.disabled =
    retakeBtn.disabled =
    promptInput.disabled =
    perfMain.disabled =
      on;
};

analyzeBtn.onclick = async () => {
  busy(true);
  answer.textContent = "";
  status("Analyzing…");
  try {
    await analyze({
      canvas,
      text: promptInput.value.trim() || PROMPT,
      preset: currentPreset(),
      onChunk: (chunk) => (answer.textContent += chunk),
    });
    status("Done. Change the prompt to ask something else, or retake.");
  } catch (error) {
    status(`Analysis failed: ${error.message}`);
  }
  busy(false);
};

retakeBtn.onclick = () => {
  video.hidden = false;
  canvas.hidden = true;
  promptBox.hidden = true;
  analyzeBtn.hidden = true;
  retakeBtn.hidden = true;
  shotBtn.hidden = false;
  shotBtn.disabled = false;
  answer.textContent = "";
  status(READY);
};
