
import { BugReporterProvider } from "./BugReporterProvider";
import { LauncherButton } from "./LauncherButton";
import { Modal } from "./Modal";
import { StepDescribe } from "./StepDescribe";
import { StepReview } from "./StepReview";
import { useBugReporter } from "../hooks";
import type { BugReporterConfig, CustomFormComponent, DockSide } from "../types";

type BugReporterProps = {
  config: BugReporterConfig;
  CustomForm?: CustomFormComponent;
};

type BugReporterShellProps = {
  CustomForm?: CustomFormComponent;
};

const DOCK_SIDES: DockSide[] = ["left", "right", "top", "bottom"];

function DockIcon({ side }: { side: DockSide }) {
  if (side === "left") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3.5 5.5h17v13h-17z" />
        <path d="M3.5 5.5h4.5v13H3.5z" />
      </svg>
    );
  }

  if (side === "right") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3.5 5.5h17v13h-17z" />
        <path d="M16 5.5h4.5v13H16z" />
      </svg>
    );
  }

  if (side === "top") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3.5 5.5h17v13h-17z" />
        <path d="M3.5 5.5h17v4.5h-17z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3.5 5.5h17v13h-17z" />
      <path d="M3.5 14h17v4.5h-17z" />
    </svg>
  );
}

function BugReporterShell({ CustomForm }: BugReporterShellProps) {
  const { config, state, setDockSide, setStep, close, reset } = useBugReporter();

  const nextFromDescribe = () => {
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
      <Modal
        isOpen={state.isOpen}
        dockSide={state.dockSide}
        title={modalTitle}
        zIndex={config.theme.zIndex + 1}
        onRequestClose={requestClose}
      >
        <div className="br-modal-header">
          <strong>{modalTitle}</strong>
          <div className="br-modal-header-actions">
            <div className="br-dock-controls" role="group" aria-label="Dock side">
              {DOCK_SIDES.map((side) => {
                const isActive = state.dockSide === side;
                return (
                  <button
                    key={side}
                    className={`br-icon-btn br-dock-btn${isActive ? " is-active" : ""}`}
                    type="button"
                    onClick={() => setDockSide(side)}
                    aria-pressed={isActive}
                    aria-label={`Dock ${side}`}
                  >
                    <DockIcon side={side} />
                  </button>
                );
              })}
            </div>
            <button className="br-icon-btn" type="button" onClick={requestClose} aria-label="Close bug reporter">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        {state.step === "describe" ? <StepDescribe onNext={nextFromDescribe} CustomForm={CustomForm} /> : null}
        {state.step === "review" || state.step === "submitting" ? (
          <StepReview
            onBack={() => {
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

export function BugReporter({ config, CustomForm }: BugReporterProps) {
  return (
    <BugReporterProvider config={config}>
      <BugReporterShell CustomForm={CustomForm} />
    </BugReporterProvider>
  );
}
