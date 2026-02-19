
import { useMemo, useRef, useState } from "react";
import { loadScreenshotCapture } from "../core/lazy";
import { blobToObjectUrl, uid } from "../core/utils";
import { validateScreenshotSize } from "../core/validation";
import { useBugReporter } from "../hooks";
import { AnnotationCanvas, type AnnotationCanvasHandle } from "./AnnotationCanvas";
import { getButtonStyle, inlineStyles } from "../styles/inline";

type StepScreenshotProps = {
  onBack: () => void;
  onNext: () => void;
};

export function StepScreenshot({ onBack, onNext }: StepScreenshotProps) {
  const {
    config,
    state: { assets },
    setScreenshot
  } = useBugReporter();

  const screenshot = useMemo(() => assets.find((asset) => asset.type === "screenshot"), [assets]);
  const annotationRef = useRef<AnnotationCanvasHandle | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCapture = async () => {
    setError(null);
    setIsCapturing(true);
    try {
      const capture = await loadScreenshotCapture();
      const blob = await capture.captureScreenshotArea({
        maskSelectors: config.privacy.maskSelectors,
        redactTextPatterns: config.privacy.redactTextPatterns
      });
      validateScreenshotSize(blob.size, config.storage.limits.maxScreenshotBytes);
      setScreenshot({
        id: uid("screenshot"),
        type: "screenshot",
        blob,
        previewUrl: blobToObjectUrl(blob),
        mimeType: blob.type || "image/png",
        filename: `screenshot-${Date.now()}.png`,
        size: blob.size
      });
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : "Screenshot capture failed.");
    } finally {
      setIsCapturing(false);
    }
  };

  const continueToNext = async () => {
    if (!screenshot) {
      setError("Take a screenshot or skip this step in config.");
      return;
    }

    if (config.features.annotations && annotationRef.current?.hasAnnotations()) {
      const annotatedBlob = await annotationRef.current.exportBlob();
      validateScreenshotSize(annotatedBlob.size, config.storage.limits.maxScreenshotBytes);
      setScreenshot({
        ...screenshot,
        blob: annotatedBlob,
        previewUrl: blobToObjectUrl(annotatedBlob),
        mimeType: annotatedBlob.type || "image/png",
        size: annotatedBlob.size
      });
    }

    onNext();
  };

  return (
    <div style={inlineStyles.step}>
      <h2 style={inlineStyles.h2}>Capture screenshot</h2>
      <p style={inlineStyles.p}>Select an area of the screen to capture.</p>

      <div style={inlineStyles.actions}>
        <button type="button" style={getButtonStyle("secondary")} onClick={onBack}>
          Back
        </button>
        <button type="button" style={getButtonStyle("primary", { disabled: isCapturing })} onClick={startCapture} disabled={isCapturing}>
          {isCapturing ? "Capturing..." : screenshot ? "Retake screenshot" : "Capture area"}
        </button>
      </div>

      {screenshot ? (
        <div style={inlineStyles.previewWrapper}>
          {config.features.annotations ? (
            <AnnotationCanvas ref={annotationRef} imageUrl={screenshot.previewUrl} />
          ) : (
            <img src={screenshot.previewUrl} alt="Screenshot preview" style={inlineStyles.preview} />
          )}
        </div>
      ) : null}

      {error ? <p style={inlineStyles.error}>{error}</p> : null}

      <div style={inlineStyles.actions}>
        <button type="button" style={getButtonStyle("primary")} onClick={continueToNext}>
          Continue
        </button>
      </div>
    </div>
  );
}
