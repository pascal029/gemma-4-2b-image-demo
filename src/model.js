import {
  AutoProcessor, Gemma4ForConditionalGeneration, TextStreamer, RawImage, env,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";
import { MODEL_ID, DTYPE } from "./config.js";

let processor, model;
// GPU power preference the loaded model was created with; fixed until reload.
export let loadedPower;

export const isLoaded = () => !!model;

export async function isCached() {
  try {
    const keys = await (await caches.open(env.cacheKey)).keys();
    return keys.some((request) => request.url.includes(MODEL_ID) && request.url.includes(`decoder_model_merged_${DTYPE}.onnx_data`));
  } catch { return false; }
}

// saveToCache false: download into memory only, nothing is written to Cache Storage.
export async function loadModel({ power, saveToCache = true, onProgress }) {
  env.useBrowserCache = saveToCache;
  env.backends.onnx.webgpu.powerPreference = power;
  const progress_callback = (progress) => {
    if (progress.status === "progress_total") onProgress?.(progress);
  };
  processor = await AutoProcessor.from_pretrained(MODEL_ID);
  model = await Gemma4ForConditionalGeneration.from_pretrained(MODEL_ID, {
    dtype: DTYPE, device: "webgpu", progress_callback,
  });
  loadedPower = power;
}

export async function deleteCachedModel() {
  await caches.delete(env.cacheKey);
}

// Runs on the main thread; move to a Web Worker if the UI stutters.
export async function analyze({ canvas, text, preset, onChunk }) {
  const prompt = processor.apply_chat_template(
    [{ role: "user", content: [{ type: "image" }, { type: "text", text }] }],
    { enable_thinking: false, add_generation_prompt: true },
  );
  processor.image_processor.max_soft_tokens = preset.tokens;
  // Gemma4Processor is (text, images, audio, options): null keeps options out of the audio slot.
  const inputs = await processor(prompt, RawImage.fromCanvas(canvas), null, { add_special_tokens: false });
  await model.generate({
    ...inputs, max_new_tokens: preset.maxNew, do_sample: false,
    streamer: new TextStreamer(processor.tokenizer, {
      skip_prompt: true, skip_special_tokens: true,
      callback_function: onChunk,
    }),
  });
}
