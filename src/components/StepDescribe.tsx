
import type { CustomFormComponent } from "../types";
import { useMemo, useRef, useState } from "react";
import { loadScreenshotCapture } from "../core/lazy";
import { blobToObjectUrl, uid } from "../core/utils";
import { validateScreenshotSize } from "../core/validation";
import { useBugReporter } from "../hooks";
import { AnnotationCanvas, type AnnotationCanvasHandle } from "./AnnotationCanvas";
import { StepRecording } from "./StepRecording";

type StepDescribeProps = {
  onNext: () => void;
  CustomForm?: CustomFormComponent;
};

export function StepDescribe({ onNext, CustomForm }: StepDescribeProps) {
  const {
    config,
    state: { draft, attributes, assets },
    updateDraft,
    setAttributes,
    updateAttribute,
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
    setError(null);

    if (config.features.screenshot && !screenshot) {
      setError("Capture a screenshot to continue.");
      return;
    }

    if (config.features.screenshot && screenshot && config.features.annotations && annotationRef.current?.hasAnnotations()) {
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

  const canContinue = Boolean(draft.title.trim()) && (!config.features.screenshot || Boolean(screenshot));

  return (
    <div className="br-step">
      <h2>Describe issue</h2>
      <p>Provide enough context so engineers can reproduce what happened.</p>

      <label className="br-field">
        Title
        <input
          value={draft.title}
          onChange={(event) => updateDraft({ title: event.target.value })}
          placeholder="Short summary"
          required
        />
      </label>

      <label className="br-field">
        Description
        <textarea
          value={draft.description}
          onChange={(event) => updateDraft({ description: event.target.value })}
          placeholder="What happened?"
          rows={4}
        />
      </label>

      {CustomForm ? (
        <CustomForm attributes={attributes} setAttributes={setAttributes} updateAttribute={updateAttribute} />
      ) : null}

      {config.features.screenshot ? (
        <>
          <h3>Screenshot</h3>
          <p>Capture the relevant area before continuing.</p>
          <div className="br-actions">
            <button type="button" className="br-btn br-btn-primary" onClick={startCapture} disabled={isCapturing}>
              {isCapturing ? "Capturing..." : screenshot ? "Retake screenshot" : "Capture area"}
            </button>
          </div>

          {screenshot ? (
            <div className="br-preview-wrapper">
              <img src={screenshot.previewUrl} alt="Screenshot preview" className="br-preview" />
              {config.features.annotations ? <AnnotationCanvas ref={annotationRef} imageUrl={screenshot.previewUrl} /> : null}
            </div>
          ) : null}
        </>
      ) : null}

      {config.features.recording ? <StepRecording embedded /> : null}

      {error ? <p className="br-error">{error}</p> : null}

      <div className="br-actions">
        <button type="button" className="br-btn br-btn-primary" disabled={!canContinue} onClick={continueToNext}>
          Continue
        </button>
      </div>
    </div>
  );
}
