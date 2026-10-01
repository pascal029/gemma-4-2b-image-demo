# Gemma 4 Photo Analyzer

Take a photo with your camera and get a description of it from Google's [Gemma 4 E2B](https://huggingface.co/google/gemma-4-E2B-it), running entirely in your browser. No server, no API key, and your photos never leave your device.

## Requirements
- Chrome or Edge with WebGPU
- A camera
- About 4 GB of free disk space and memory (the model is about 3.2 GB)
- Node.js 20.19+ or 22.12+

## Run
```bash
npm install
npm run dev
```
Open http://localhost:5173.

## How it works
1. Allow camera access when the browser asks.
2. Click **Download model** and confirm. You can choose whether to save the model in the browser so it only downloads once.
3. Click **Take photo**. The description appears word by word.
4. **Delete saved model** (bottom of the page) frees the disk space.

## Notes
- The page loads [`onnx-community/gemma-4-E2B-it-ONNX`](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX), a browser-ready conversion of `google/gemma-4-E2B-it`. Inference runs through [Transformers.js](https://github.com/huggingface/transformers.js) on WebGPU.
- The saved model is tied to the page's address and port. Opening the page from a different address downloads it again.
- The whole app is one file: `index.html`.
