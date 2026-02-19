import type { ComponentType } from "react";

export type StorageMode = "s3-presigned" | "local-public" | "proxy";

export type ReportEnvironment = "development" | "staging" | "production";
export type AssetType = "screenshot" | "recording" | "attachment";
export type FlowStep = "describe" | "screenshot" | "recording" | "review" | "submitting" | "success";
export type DockSide = "left" | "right" | "top" | "bottom";
export type LauncherPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
export type ThemeMode = "dark" | "light";

export type FeatureFlags = {
  screenshot?: boolean;
  recording?: boolean;
  annotations?: boolean;
  consoleLogs?: boolean;
  networkInfo?: boolean;
};

export type ThemeConfig = {
  primaryColor?: string;
  position?: LauncherPosition;
  zIndex?: number;
  borderRadius?: string;
};

export type StorageLimits = {
  maxVideoSeconds?: number;
  maxVideoBytes?: number;
  maxScreenshotBytes?: number;
};

export type UploadFile = {
  id: string;
  name: string;
  type: AssetType;
  mimeType: string;
  size: number;
};

export type UploadInstruction = {
  id: string;
  method: "PUT" | "POST";
  uploadUrl: string;
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  key?: string;
  publicUrl?: string;
  type: AssetType;
};

export type AssetReference = {
  id: string;
  type: AssetType;
  url: string;
  key?: string;
  mimeType?: string;
  size?: number;
};

export interface StorageProvider {
  prepareUploads(files: UploadFile[]): Promise<UploadInstruction[]>;
  upload(instruction: UploadInstruction, blob: Blob, onProgress?: (progress: number) => void): Promise<AssetReference>;
}

export type CapturedAsset = {
  id: string;
  type: AssetType;
  blob: Blob;
  previewUrl: string;
  mimeType: string;
  filename: string;
  size: number;
};

export type DiagnosticsSnapshot = {
  url: string;
  referrer: string;
  timestamp: string;
  timezone: string;
  viewport: {
    width: number;
    height: number;
    pixelRatio: number;
  };
  browser: string;
  os: string;
  language: string;
  userAgent: string;
  userAgentData?: {
    brands?: Array<{
      brand: string;
      version: string;
    }>;
    mobile?: boolean;
    platform?: string;
  };
  appVersion?: string;
  environment?: ReportEnvironment;
  projectId?: string;
  logs?: ConsoleLogEntry[];
  requests?: NetworkRequestEntry[];
  navigationTiming?: {
    domComplete?: number;
    loadEventEnd?: number;
    responseEnd?: number;
  };
};

export type ConsoleLogEntry = {
  level: "log" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
};

export type DiagnosticsPreview = {
  errorLogs: ConsoleLogEntry[];
  failedRequests: NetworkRequestEntry[];
};

export type NetworkRequestEntry = {
  transport: "fetch" | "xhr";
  method: string;
  url: string;
  status?: number;
  ok?: boolean;
  durationMs: number;
  timestamp: string;
  error?: string;
};

export type ReportDraft = {
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
};

export type Reporter = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  ip?: string;
  anonymous: boolean;
};

export type CustomFormProps = {
  attributes: Record<string, unknown>;
  setAttributes: (next: Record<string, unknown>) => void;
  updateAttribute: (key: string, value: unknown) => void;
};

export type CustomFormComponent = ComponentType<CustomFormProps>;

export type BugReportPayload = {
  issue: {
    title: string;
    description: string;
    projectId?: string;
    environment?: ReportEnvironment;
    appVersion?: string;
    assets: AssetReference[];
  };
  context: {
    url: string;
    referrer: string;
    timestamp: string;
    timezone: string;
    viewport: {
      width: number;
      height: number;
      pixelRatio: number;
    };
    client: {
      browser: string;
      os: string;
      language: string;
      userAgent: string;
    };
    userAgentData?: DiagnosticsSnapshot["userAgentData"];
    performance: {
      navigationTiming?: DiagnosticsSnapshot["navigationTiming"];
    };
    logs?: ConsoleLogEntry[];
    requests?: NetworkRequestEntry[];
  };
  reporter: Reporter;
  attributes: Record<string, unknown>;
};

export type BugReportResponse = {
  id?: string;
  message?: string;
  [key: string]: unknown;
};

export type BugReporterErrorCode =
  | "VALIDATION_ERROR"
  | "CAPTURE_ERROR"
  | "RECORDING_ERROR"
  | "UPLOAD_ERROR"
  | "SUBMIT_ERROR"
  | "PERMISSION_DENIED"
  | "ABORTED";

export class BugReporterError extends Error {
  readonly code: BugReporterErrorCode;
  readonly cause?: unknown;

  constructor(code: BugReporterErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "BugReporterError";
    this.code = code;
    this.cause = cause;
  }
}

export type BugReporterConfig = {
  apiEndpoint: string;
  projectId?: string;
  appVersion?: string;
  environment?: ReportEnvironment;
  storage?: {
    mode: StorageMode;
    s3?: {
      presignEndpoint: string;
      publicBaseUrl?: string;
    };
    local?: {
      uploadEndpoint: string;
      publicBaseUrl?: string;
    };
    proxy?: {
      uploadEndpoint: string;
    };
    limits?: StorageLimits;
  };
  auth?: {
    headers?: Record<string, string>;
    withCredentials?: boolean;
  };
  theme?: ThemeConfig;
  features?: FeatureFlags;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    ip?: string;
    anonymous?: boolean;
  };
  attributes?: Record<string, unknown>;
  privacy?: {
    maskSelectors?: string[];
    redactTextPatterns?: Array<string | RegExp>;
  };
  diagnostics?: {
    consoleBufferSize?: number;
    requestBufferSize?: number;
  };
  hooks?: {
    beforeSubmit?: (payload: BugReportPayload) => Promise<BugReportPayload | null> | BugReportPayload | null;
    onSuccess?: (response: BugReportResponse) => void;
    onError?: (error: BugReporterError) => void;
  };
};

export type BugReporterState = {
  isOpen: boolean;
  dockSide: DockSide;
  step: FlowStep;
  draft: ReportDraft;
  attributes: Record<string, unknown>;
  assets: CapturedAsset[];
  diagnostics?: DiagnosticsSnapshot;
  uploadProgress: number;
  isSubmitting: boolean;
  error?: string;
};

export type BugReporterContextValue = {
  config: RequiredBugReporterConfig;
  state: BugReporterState;
  open: () => void;
  close: () => void;
  reset: () => void;
  setDockSide: (dockSide: DockSide) => void;
  setStep: (step: FlowStep) => void;
  updateDraft: (next: Partial<ReportDraft>) => void;
  setAttributes: (next: Record<string, unknown>) => void;
  updateAttribute: (key: string, value: unknown) => void;
  setScreenshot: (asset?: CapturedAsset) => void;
  setRecording: (asset?: CapturedAsset) => void;
  submit: () => Promise<void>;
  retrySubmit: () => Promise<void>;
  getDiagnosticsPreview: () => DiagnosticsPreview;
};

export type RequiredBugReporterConfig = {
  apiEndpoint: string;
  projectId?: string;
  appVersion?: string;
  environment?: ReportEnvironment;
  storage: {
    mode: StorageMode;
    s3?: {
      presignEndpoint: string;
      publicBaseUrl?: string;
    };
    local?: {
      uploadEndpoint: string;
      publicBaseUrl?: string;
    };
    proxy?: {
      uploadEndpoint: string;
    };
    limits: Required<StorageLimits>;
  };
  auth: {
    headers: Record<string, string>;
    withCredentials: boolean;
  };
  theme: Required<ThemeConfig>;
  features: Required<FeatureFlags>;
  user?: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
    ip?: string;
    anonymous?: boolean;
  };
  attributes: Record<string, unknown>;
  privacy: {
    maskSelectors: string[];
    redactTextPatterns: Array<string | RegExp>;
  };
  diagnostics: {
    consoleBufferSize: number;
    requestBufferSize: number;
  };
  hooks: {
    beforeSubmit?: (payload: BugReportPayload) => Promise<BugReportPayload | null> | BugReportPayload | null;
    onSuccess?: (response: BugReportResponse) => void;
    onError?: (error: BugReporterError) => void;
  };
};
