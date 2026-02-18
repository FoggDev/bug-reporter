
import { BugReporterProvider } from "./BugReporterProvider";
import { LauncherButton } from "./LauncherButton";
import { Modal } from "./Modal";
import { StepDescribe } from "./StepDescribe";
import { StepRecording } from "./StepRecording";
import { StepReview } from "./StepReview";
import { StepScreenshot } from "./StepScreenshot";
import { useBugReporter } from "../hooks";
import type { BugReporterConfig } from "../types";

type BugReporterProps = {
  config: BugReporterConfig;
};

function BugReporterShell() {
  const { config, state, setStep, close, reset } = useBugReporter();

  const nextFromDescribe = () => {
    if (config.features.screenshot) {
      setStep("screenshot");
      return;
    }
    if (config.features.recording) {
      setStep("recording");
      return;
    }
    setStep("review");
  };

  const nextFromScreenshot = () => {
    if (config.features.recording) {
      setStep("recording");
      return;
    }
    setStep("review");
  };

  const requestClose = () => {
    if (state.step === "success") {
      reset();
    }
    close();
  };

  const modalTitle = state.step === "success" ? "Report submitted" : "Report a bug";

  return (
    <>
      <LauncherButton />
      <Modal isOpen={state.isOpen} title={modalTitle} zIndex={config.theme.zIndex + 1} onRequestClose={requestClose}>
        <div className="br-modal-header">
          <strong>{modalTitle}</strong>
          <button className="br-icon-btn" type="button" onClick={requestClose} aria-label="Close bug reporter">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </div>

        {state.step === "describe" ? <StepDescribe onNext={nextFromDescribe} /> : null}
        {state.step === "screenshot" ? <StepScreenshot onBack={() => setStep("describe")} onNext={nextFromScreenshot} /> : null}
        {state.step === "recording" ? (
          <StepRecording
            onBack={() => setStep(config.features.screenshot ? "screenshot" : "describe")}
            onNext={() => setStep("review")}
          />
        ) : null}
        {state.step === "review" || state.step === "submitting" ? (
          <StepReview
            onBack={() => {
              if (config.features.recording) {
                setStep("recording");
                return;
              }
              if (config.features.screenshot) {
                setStep("screenshot");
                return;
              }
              setStep("describe");
            }}
          />
        ) : null}

        {state.step === "success" ? (
          <div className="br-step">
            <h2>Thanks, report submitted</h2>
            <p>Your bug report has been sent successfully.</p>
            <div className="br-actions">
              <button type="button" className="br-btn br-btn-primary" onClick={requestClose}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

export function BugReporter({ config }: BugReporterProps) {
  return (
    <BugReporterProvider config={config}>
      <BugReporterShell />
    </BugReporterProvider>
  );
}
