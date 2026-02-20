
import { useEffect, useMemo, useRef, useState } from "react";
import type { ActiveRecording } from "../core/recording";
import { loadScreenRecording } from "../core/lazy";
import { blobToObjectUrl, uid } from "../core/utils";
import { validateVideoSize } from "../core/validation";
import { useBugReporter } from "../hooks";
import { getButtonStyle, inlineStyles } from "../styles/inline";

type StepRecordingProps = {
  onBack?: () => void;
  onNext?: () => void;
  embedded?: boolean;
  compact?: boolean;
};

type SharedRecordingState = {
  active: ActiveRecording;
  seconds: number;
};

let sharedRecording: SharedRecordingState | null = null;
const subscribers = new Set<() => void>();

function notifySubscribers(): void {
  subscribers.forEach((handler) => handler());
}

export function StepRecording({ onBack, onNext, embedded = false, compact = false }: StepRecordingProps) {
  const {
    config,
    state: { assets },
    setRecording
  } = useBugReporter();

  const recording = useMemo(() => assets.find((asset) => asset.type === "recording"), [assets]);
  const activeRef = useRef<ActiveRecording | null>(null);
  const mountedRef = useRef(true);
  const [isRecording, setIsRecording] = useState(Boolean(sharedRecording));
  const [isRecordHover, setIsRecordHover] = useState(false);
  const [seconds, setSeconds] = useState(sharedRecording?.seconds ?? 0);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (sharedRecording) {
      setError("Recording is already in progress.");
      return;
    }

    setError(null);
    setSeconds(0);
    setIsRecording(true);

    try {
      const recorderModule = await loadScreenRecording();
      const active = await recorderModule.startScreenRecording({
        maxSeconds: config.storage.limits.maxVideoSeconds,
        maxBytes: config.storage.limits.maxVideoBytes,
        onTick: (tick) => {
          if (sharedRecording) {
            sharedRecording.seconds = tick;
            notifySubscribers();
          }
        }
      });
      activeRef.current = active;
      sharedRecording = { active, seconds: 0 };
      notifySubscribers();

      const result = await active.promise;
      validateVideoSize(result.blob.size, config.storage.limits.maxVideoBytes);
      setRecording({
        id: uid("recording"),
        type: "recording",
        blob: result.blob,
        previewUrl: blobToObjectUrl(result.blob),
        mimeType: result.mimeType,
        filename: `recording-${Date.now()}.webm`,
        size: result.blob.size
      });
    } catch (recordingError) {
      if (recordingError instanceof Error && recordingError.message.includes("cancelled")) {
        return;
      }
      if (mountedRef.current) {
        setError(recordingError instanceof Error ? recordingError.message : "Recording failed.");
      }
    } finally {
      activeRef.current = null;
      sharedRecording = null;
      notifySubscribers();
      if (mountedRef.current) {
        setIsRecording(false);
      }
    }
  };

  const stop = () => {
    if (sharedRecording) {
      sharedRecording.active.stop();
      return;
    }
    activeRef.current?.stop();
  };

  useEffect(() => {
    mountedRef.current = true;
    const sync = () => {
      activeRef.current = sharedRecording?.active ?? null;
      setIsRecording(Boolean(sharedRecording));
      setSeconds(sharedRecording?.seconds ?? 0);
    };
    sync();
    subscribers.add(sync);

    return () => {
      mountedRef.current = false;
      subscribers.delete(sync);
    };
  }, []);

  if (compact) {
    const compactRecordingAction = !isRecording ? (
      <button
        type="button"
        style={{
          ...getButtonStyle("primary", { fullWidth: true }),
          ...inlineStyles.captureButton,
          ...(isRecordHover ? { background: "#8120C7" } : {})
        }}
        onClick={start}
        onMouseEnter={() => setIsRecordHover(true)}
        onMouseLeave={() => setIsRecordHover(false)}
      >
        <svg style={inlineStyles.captureIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M3.5 8.5h3l1.2-2h8.6l1.2 2h3v7h-3l-1.2 2H7.7l-1.2-2h-3z" />
        </svg>
        <span>{recording ? "Retake recording" : "Record a video"}</span>
        {recording ? <span style={inlineStyles.captureDone}>Saved</span> : null}
      </button>
    ) : (
      <button type="button" style={{ ...getButtonStyle("danger", { fullWidth: true }), ...inlineStyles.captureButton }} onClick={stop}>
        <svg style={inlineStyles.captureIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <rect x="7" y="7" width="10" height="10" />
        </svg>
        <span>Stop ({seconds}s)</span>
      </button>
    );

    return (
      <div style={inlineStyles.captureItem}>
        {compactRecordingAction}
        {error ? <p style={{ ...inlineStyles.error, marginTop: "8px" }}>{error}</p> : null}
      </div>
    );
  }

  return (
    <div style={embedded ? undefined : inlineStyles.step}>
      {embedded ? <h3 style={inlineStyles.h3}>Screen recording</h3> : <h2 style={inlineStyles.h2}>Screen recording</h2>}
      <p style={inlineStyles.p}>Record up to {config.storage.limits.maxVideoSeconds} seconds. You can minimize this sidebar while recording.</p>

      <div style={inlineStyles.actions}>
        {onBack ? (
          <button type="button" style={getButtonStyle("secondary", { disabled: isRecording })} onClick={onBack} disabled={isRecording}>
            Back
          </button>
        ) : null}
        {!isRecording ? (
          <button
            type="button"
            style={{
              ...getButtonStyle("primary"),
              ...(isRecordHover ? { background: "#8120C7" } : {})
            }}
            onClick={start}
            onMouseEnter={() => setIsRecordHover(true)}
            onMouseLeave={() => setIsRecordHover(false)}
          >
            {recording ? "Retake recording" : "Record a video"}
          </button>
        ) : (
          <button type="button" style={getButtonStyle("danger")} onClick={stop}>
            Stop ({seconds}s)
          </button>
        )}
      </div>

      {recording ? <video src={recording.previewUrl} style={inlineStyles.preview} controls /> : null}
      {error ? <p style={inlineStyles.error}>{error}</p> : null}

      {onNext ? (
        <div style={inlineStyles.actions}>
          <button type="button" style={getButtonStyle("primary")} onClick={onNext}>
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
}
