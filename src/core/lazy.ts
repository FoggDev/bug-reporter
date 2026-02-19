import { captureScreenshotArea } from "./screenshot";
import { startScreenRecording } from "./recording";

const screenshotCaptureModule = { captureScreenshotArea };
const screenRecordingModule = { startScreenRecording };

export async function loadScreenshotCapture() {
  return screenshotCaptureModule;
}

export async function loadScreenRecording() {
  return screenRecordingModule;
}
