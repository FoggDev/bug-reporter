
import "./styles/index.css";

export { BugReporter, BugReporterProvider } from "./components";
export { useBugReporter } from "./hooks";

export type {
  AssetReference,
  BugReportPayload,
  BugReportResponse,
  BugReporterConfig,
  BugReporterContextValue,
  BugReporterState,
  CapturedAsset,
  CustomFormProps,
  DockSide,
  DiagnosticsSnapshot,
  FeatureFlags,
  StorageMode,
  StorageProvider,
  ThemeConfig,
  UploadFile,
  UploadInstruction
} from "./types";

export { BugReporterError } from "./types";
