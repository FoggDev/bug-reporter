
import { useEffect, useMemo, useRef, useState } from "react";
import type { ActiveRecording } from "../core/recording";
import { loadScreenRecording } from "../core/lazy";
import { blobToObjectUrl, uid } from "../core/utils";
import { validateVideoSize } from "../core/validation";
import { useBugReporter } from "../hooks";

type StepRecordingProps = {
  onBack?: () => void;
  onNext?: () => void;
  embedded?: boolean;
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

export function StepRecording({ onBack, onNext, embedded = false }: StepRecordingProps) {
  const {
    config,
    state: { assets },
    setRecording
  } = useBugReporter();

  const recording = useMemo(() => assets.find((asset) => asset.type === "recording"), [assets]);
  const activeRef = useRef<ActiveRecording | null>(null);
  const mountedRef = useRef(true);
  const [isRecording, setIsRecording] = useState(Boolean(sharedRecording));
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

  return (
    <div className={embedded ? undefined : "br-step"}>
      {embedded ? <h3>Screen recording</h3> : <h2>Screen recording</h2>}
      <p>Record up to {config.storage.limits.maxVideoSeconds} seconds. You can minimize this sidebar while recording.</p>

      <div className="br-actions">
        {onBack ? (
          <button type="button" className="br-btn br-btn-secondary" onClick={onBack} disabled={isRecording}>
            Back
          </button>
        ) : null}
        {!isRecording ? (
          <button type="button" className="br-btn br-btn-primary" onClick={start}>
            {recording ? "Retake recording" : "Start recording"}
          </button>
        ) : (
          <button type="button" className="br-btn br-btn-danger" onClick={stop}>
            Stop ({seconds}s)
          </button>
        )}
      </div>

      {recording ? <video src={recording.previewUrl} className="br-preview" controls /> : null}
      {error ? <p className="br-error">{error}</p> : null}

      {onNext ? (
        <div className="br-actions">
          <button type="button" className="br-btn br-btn-primary" onClick={onNext}>
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
}
