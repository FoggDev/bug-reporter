
import { BugReporterProvider } from "./BugReporterProvider";
import { FloatingRecordingPanel } from "./FloatingRecordingPanel";
import { LauncherButton } from "./LauncherButton";
import { Modal } from "./Modal";
import { StepDescribe } from "./StepDescribe";
import { StepReview } from "./StepReview";
import { useBugReporter } from "../hooks";
import type {
  BugReportResponse,
  BugReporterConfig,
  BugReporterSubmitData,
  CustomFormComponent,
  DockSide,
  LauncherPosition,
  ThemeMode
} from "../types";
import { getButtonStyle, getDockButtonStyle, inlineStyles } from "../styles/inline";

type BugReporterProps = {
  config: BugReporterConfig;
  CustomForm?: CustomFormComponent;
  launcherPosition?: LauncherPosition;
  launcherText?: string;
  describeStepTitle?: string;
  describeStepDescription?: string;
  themeMode?: ThemeMode;
  buttonColor?: string;
  reporter?: NonNullable<BugReporterConfig["user"]>;
  onSubmit?: (payload: BugReporterSubmitData) => Promise<BugReportResponse | void> | BugReportResponse | void;
};

type BugReporterShellProps = {
  CustomForm?: CustomFormComponent;
  launcherPosition?: LauncherPosition;
  launcherText?: string;
  describeStepTitle: string;
  describeStepDescription: string;
  themeMode: ThemeMode;
  buttonColor: string;
};

const DEFAULT_DESCRIBE_STEP_TITLE = "Report a bug";
const DEFAULT_DESCRIBE_STEP_DESCRIPTION = "Provide enough context so engineers can reproduce what happened.";

const DOCK_SIDES: DockSide[] = ["left", "right", "top", "bottom"];

function DockIcon({ side }: { side: DockSide }) {
  if (side === "left") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={inlineStyles.iconSvg}>
        <path d="M3.5 5.5h17v13h-17z" />
        <path d="M3.5 5.5h4.5v13H3.5z" fill="currentColor" stroke="none" opacity="0.85" />
      </svg>
    );
  }

  if (side === "right") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={inlineStyles.iconSvg}>
        <path d="M3.5 5.5h17v13h-17z" />
        <path d="M16 5.5h4.5v13H16z" fill="currentColor" stroke="none" opacity="0.85" />
      </svg>
    );
  }

  if (side === "top") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={inlineStyles.iconSvg}>
        <path d="M3.5 5.5h17v13h-17z" />
        <path d="M3.5 5.5h17v4.5h-17z" fill="currentColor" stroke="none" opacity="0.85" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={inlineStyles.iconSvg}>
      <path d="M3.5 5.5h17v13h-17z" />
      <path d="M3.5 14h17v4.5h-17z" fill="currentColor" stroke="none" opacity="0.85" />
    </svg>
  );
}

function BugReporterShell({
  CustomForm,
  launcherPosition,
  launcherText,
  describeStepTitle,
  describeStepDescription,
  themeMode,
  buttonColor
}: BugReporterShellProps) {
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

  const modalTitle = state.step === "success" ? "Report submitted" : describeStepTitle;

  return (
    <>
      <LauncherButton position={launcherPosition} text={launcherText} themeMode={themeMode} buttonColor={buttonColor} />
      <FloatingRecordingPanel isMainPanelOpen={state.isOpen} themeMode={themeMode} zIndex={config.theme.zIndex + 2} />
      <Modal
        isOpen={state.isOpen}
        dockSide={state.dockSide}
        themeMode={themeMode}
        buttonColor={buttonColor}
        title={modalTitle}
        zIndex={config.theme.zIndex + 1}
        onRequestClose={requestClose}
      >
        <div style={inlineStyles.modalHeader}>
          <div style={inlineStyles.dockControls} role="group" aria-label="Dock side">
            {DOCK_SIDES.map((side) => {
              const isActive = state.dockSide === side;
              return (
                <button
                  key={side}
                  style={getDockButtonStyle(isActive)}
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
          <button style={inlineStyles.iconButton} type="button" onClick={requestClose} aria-label="Close bug reporter">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={inlineStyles.iconSvg}>
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </div>

        {state.step === "describe" ? (
          <StepDescribe
            onNext={nextFromDescribe}
            CustomForm={CustomForm}
            describeStepTitle={describeStepTitle}
            describeStepDescription={describeStepDescription}
          />
        ) : null}
        {state.step === "review" || state.step === "submitting" ? (
          <StepReview
            onBack={() => {
              setStep("describe");
            }}
          />
        ) : null}

        {state.step === "success" ? (
          <div style={inlineStyles.step}>
            <h2 style={inlineStyles.h2}>Thanks, report submitted</h2>
            <p style={inlineStyles.p}>Your bug report has been sent successfully.</p>
            <div style={inlineStyles.actions}>
              <button type="button" style={getButtonStyle("primary")} onClick={requestClose}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

export function BugReporter({
  config,
  CustomForm,
  launcherPosition,
  launcherText,
  describeStepTitle = DEFAULT_DESCRIBE_STEP_TITLE,
  describeStepDescription = DEFAULT_DESCRIBE_STEP_DESCRIPTION,
  themeMode = "dark",
  buttonColor,
  reporter,
  onSubmit
}: BugReporterProps) {
  const resolvedButtonColor = buttonColor ?? config.theme?.primaryColor ?? "#390E58";
  const resolvedConfig = reporter
    ? {
        ...config,
        user: {
          ...(config.user ?? {}),
          ...reporter
        }
      }
    : config;

  return (
    <BugReporterProvider config={resolvedConfig} onSubmit={onSubmit}>
      <BugReporterShell
        CustomForm={CustomForm}
        launcherPosition={launcherPosition}
        launcherText={launcherText}
        describeStepTitle={describeStepTitle}
        describeStepDescription={describeStepDescription}
        themeMode={themeMode}
        buttonColor={resolvedButtonColor}
      />
    </BugReporterProvider>
  );
}
