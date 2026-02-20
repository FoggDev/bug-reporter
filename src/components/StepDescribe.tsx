import type { CustomFormComponent } from "../types";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { loadScreenshotCapture } from "../core/lazy";
import { blobToObjectUrl, uid } from "../core/utils";
import { validateScreenshotSize } from "../core/validation";
import { useBugReporter } from "../hooks";
import { AnnotationCanvas, type AnnotationCanvasHandle } from "./AnnotationCanvas";
import { StepRecording } from "./StepRecording";
import { getButtonStyle, inlineStyles } from "../styles/inline";

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
  const recording = useMemo(() => assets.find((asset) => asset.type === "recording"), [assets]);
  const annotationRef = useRef<AnnotationCanvasHandle | null>(null);
  const customFormRef = useRef<HTMLDivElement | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isScreenshotHover, setIsScreenshotHover] = useState(false);
  const [isDraggingScreenshot, setIsDraggingScreenshot] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CustomForm) {
      return;
    }

    const root = customFormRef.current;
    if (!root) {
      return;
    }

    const applyInlineFormStyles = () => {
      root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select").forEach((control) => {
        if (control.dataset.brInlineStyled === "true") {
          return;
        }

        Object.assign(control.style, inlineStyles.input, {
          width: "100%",
          boxSizing: "border-box"
        });
        control.dataset.brInlineStyled = "true";
      });

      root.querySelectorAll<HTMLLabelElement>("label.br-field").forEach((field) => {
        if (field.dataset.brInlineStyled === "true") {
          return;
        }
        Object.assign(field.style, inlineStyles.field);
        field.dataset.brInlineStyled = "true";
      });
    };

    applyInlineFormStyles();

    const observer = new MutationObserver(() => {
      applyInlineFormStyles();
    });
    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [CustomForm]);

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

  const applyScreenshotFile = (file?: File) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported for screenshots.");
      return;
    }

    try {
      validateScreenshotSize(file.size, config.storage.limits.maxScreenshotBytes);
      setScreenshot({
        id: uid("screenshot"),
        type: "screenshot",
        blob: file,
        previewUrl: blobToObjectUrl(file),
        mimeType: file.type || "image/png",
        filename: file.name || `screenshot-${Date.now()}.png`,
        size: file.size
      });
      setError(null);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "Invalid screenshot file.");
    }
  };

  const onScreenshotInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyScreenshotFile(event.target.files?.[0]);
    event.currentTarget.value = "";
  };

  const onScreenshotDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingScreenshot(false);
    applyScreenshotFile(event.dataTransfer.files?.[0]);
  };

  const onScreenshotDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDraggingScreenshot) {
      setIsDraggingScreenshot(true);
    }
  };

  const onScreenshotDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingScreenshot(false);
  };

  const onScreenshotDropZoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      screenshotInputRef.current?.click();
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
    <div style={{ ...inlineStyles.step, display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <h2 style={inlineStyles.h2}>Report a bug</h2>
      <p style={inlineStyles.p}>Provide enough context so engineers can reproduce what happened.</p>

      <label style={inlineStyles.field}>
        Title
        <input
          style={inlineStyles.input}
          value={draft.title}
          onChange={(event) => updateDraft({ title: event.target.value })}
          placeholder="Short summary"
          required
        />
      </label>

      <label style={inlineStyles.field}>
        Description
        <textarea
          style={inlineStyles.input}
          value={draft.description}
          onChange={(event) => updateDraft({ description: event.target.value })}
          placeholder="What happened?"
          rows={4}
        />
      </label>

      {CustomForm ? (
        <div ref={customFormRef}>
          <CustomForm attributes={attributes} setAttributes={setAttributes} updateAttribute={updateAttribute} />
        </div>
      ) : null}

      {config.features.screenshot || config.features.recording ? (
        <>
          <h3 style={inlineStyles.h3}>Capture</h3>
          <div style={inlineStyles.captureRow}>
            {config.features.screenshot ? (
              <div style={inlineStyles.captureItem}>
                <button
                  type="button"
                  style={{
                    ...getButtonStyle("primary", { disabled: isCapturing, fullWidth: true }),
                    ...inlineStyles.captureButton,
                    ...(isScreenshotHover && !isCapturing ? { background: "#8120C7" } : {})
                  }}
                  onClick={startCapture}
                  onMouseEnter={() => setIsScreenshotHover(true)}
                  onMouseLeave={() => setIsScreenshotHover(false)}
                  disabled={isCapturing}
                >
                  <svg style={inlineStyles.captureIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M4 8.5h3l1.2-2h7.6l1.2 2h3v9H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                  <span>{isCapturing ? "Capturing..." : screenshot ? "Retake screenshot" : "Screenshot"}</span>
                  {screenshot ? <span style={inlineStyles.captureDone}>Saved</span> : null}
                </button>
              </div>
            ) : null}
            {config.features.recording ? <StepRecording embedded compact /> : null}
          </div>
          <p style={inlineStyles.captureNote}>
            {config.features.screenshot && config.features.recording
              ? `Capture a screenshot and optionally record up to ${config.storage.limits.maxVideoSeconds} seconds.`
              : config.features.screenshot
                ? "Capture the relevant area before continuing."
                : `Record up to ${config.storage.limits.maxVideoSeconds} seconds.`}
          </p>
          {config.features.screenshot ? (
            <>
              <div
                style={{ ...inlineStyles.dropZone, ...(isDraggingScreenshot ? inlineStyles.dropZoneActive : {}) }}
                onDrop={onScreenshotDrop}
                onDragOver={onScreenshotDragOver}
                onDragLeave={onScreenshotDragLeave}
                onClick={() => screenshotInputRef.current?.click()}
                onKeyDown={onScreenshotDropZoneKeyDown}
                role="button"
                tabIndex={0}
                aria-label="Drag and drop screenshot"
              >
                Drag and drop a screenshot here, or click to upload.
              </div>
              <input
                ref={screenshotInputRef}
                type="file"
                accept="image/*"
                style={inlineStyles.hiddenFileInput}
                onChange={onScreenshotInputChange}
              />
            </>
          ) : null}

          {screenshot ? (
            <div style={inlineStyles.previewWrapper}>
              {config.features.annotations ? (
                <AnnotationCanvas ref={annotationRef} imageUrl={screenshot.previewUrl} />
              ) : (
                <img src={screenshot.previewUrl} alt="Screenshot preview" style={inlineStyles.preview} />
              )}
            </div>
          ) : null}

          {!screenshot && recording ? <p style={inlineStyles.captureNote}>Recording saved.</p> : null}
        </>
      ) : null}

      {error ? <p style={inlineStyles.error}>{error}</p> : null}

      <div
        style={{
          ...inlineStyles.actions,
          marginTop: "auto",
          position: "sticky",
          bottom: 0,
          background: "var(--br-bg)",
          paddingTop: "12px",
          paddingBottom: "12px"
        }}
      >
        <button
          type="button"
          style={getButtonStyle("primary", { disabled: !canContinue, fullWidth: true })}
          disabled={!canContinue}
          onClick={continueToNext}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
