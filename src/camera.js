export async function startCamera(video) {
  video.srcObject = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
    audio: false,
  });
}

// Freeze the current video frame onto the canvas.
export function capturePhoto(video, canvas) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
}
