// Runs transformers.js off the main thread: building the ONNX sessions from ~3 GB of
// weights and generating tokens would otherwise freeze the page.
import {
  AutoProcessor,
  Gemma4ForConditionalGeneration,
  TextStreamer,
  RawImage,
  LogitsProcessor,
  env,
} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";
import { MODEL_ID, DTYPE, CACHE_KEY, SAMPLING } from "./config.js";
import { nucleusFilter } from "./sampling.js";

env.cacheKey = CACHE_KEY;
let processor, model;

// Applies top_k + top_p ourselves; the built-in top_p warper is a no-op in transformers.js 4.3.0.
class TopKTopPWarper extends LogitsProcessor {
  constructor(topK, topP) {
    super();
    this.topK = topK;
    this.topP = topP;
  }

  _call(_inputIds, logits) {
    const vocabulary = logits.dims.at(-1);
    for (let row = 0; row * vocabulary < logits.data.length; row++) {
      nucleusFilter(
        logits.data.subarray(row * vocabulary, (row + 1) * vocabulary),
        this.topK,
        this.topP,
      );
    }
    return logits;
  }
}

const handlers = {
  async load({ power, saveToCache }, reply) {
    env.useBrowserCache = saveToCache;
    env.backends.onnx.webgpu.powerPreference = power;
    const progress_callback = (progress) => {
      if (progress.status !== "progress_total") return;
      reply("progress", {
        progress: progress.progress,
        loaded: progress.loaded,
        total: progress.total,
      });
    };
    processor = await AutoProcessor.from_pretrained(MODEL_ID);
    model = await Gemma4ForConditionalGeneration.from_pretrained(MODEL_ID, {
      dtype: DTYPE,
      device: "webgpu",
      progress_callback,
    });
  },

  async analyze({ image, text, preset }, reply) {
    const prompt = processor.apply_chat_template(
      [{ role: "user", content: [{ type: "image" }, { type: "text", text }] }],
      { enable_thinking: false, add_generation_prompt: true },
    );
    processor.image_processor.max_soft_tokens = preset.tokens;
    const photo = new RawImage(image.data, image.width, image.height, 4);
    // Gemma4Processor is (text, images, audio, options): null keeps options out of the audio slot.
    const inputs = await processor(prompt, photo, null, {
      add_special_tokens: false,
    });
    await model.generate({
      ...inputs,
      ...SAMPLING,
      max_new_tokens: preset.maxNew,
      logits_processor: [new TopKTopPWarper(SAMPLING.top_k, SAMPLING.top_p)],
      streamer: new TextStreamer(processor.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (chunk) => reply("chunk", chunk),
      }),
    });
  },
};

// Message protocol: { id, type, payload } in; { id, kind: "progress" | "chunk" | "done" | "error", value } out.
self.onmessage = async ({ data: { id, type, payload } }) => {
  const reply = (kind, value) => self.postMessage({ id, kind, value });
  try {
    if (!handlers[type]) throw new Error(`Unknown model request: ${type}`);
    await handlers[type](payload, reply);
    reply("done");
  } catch (error) {
    reply("error", error?.message ?? String(error));
  }
};
