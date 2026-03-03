
import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { collectDiagnostics, ConsoleBuffer, NetworkBuffer } from "../diagnostics";
import { BugReporterContext } from "../core/context";
import { withDefaults } from "../core/defaults";
import { resolveReporter } from "../core/reporter";
import { submitReport } from "../core/submit";
import { revokeObjectUrl } from "../core/utils";
import { BugReporterError } from "../types";
import type {
  BugReportResponse,
  BugReporterConfig,
  BugReporterSubmitAsset,
  BugReporterContextValue,
  BugReporterSubmitData,
  BugReporterState,
  CapturedAsset,
  DockSide,
  DiagnosticsPreview,
  FlowStep,
  ReportDraft,
  Reporter
} from "../types";

type BugReporterProviderProps = PropsWithChildren<{
  config: BugReporterConfig;
  onSubmit?: (payload: BugReporterSubmitData) => Promise<BugReportResponse | void> | BugReportResponse | void;
}>;

const EMPTY_DRAFT: ReportDraft = {
  title: "",
  description: "",
  stepsToReproduce: "",
  expectedBehavior: "",
  actualBehavior: ""
};

const BASE_STATE: BugReporterState = {
  isOpen: false,
  dockSide: "right",
  step: "describe",
  draft: EMPTY_DRAFT,
  attributes: {},
  assets: [],
  uploadProgress: 0,
  isSubmitting: false,
  error: undefined
};

function createSubmitError(message: string, cause?: unknown): BugReporterError {
  return new BugReporterError("SUBMIT_ERROR", message, cause);
}

function ensureSubmitFileMetadata(file: BugReporterSubmitAsset): BugReporterSubmitAsset {
  const withMeta = file as BugReporterSubmitAsset & {
    path?: string;
    relativePath?: string;
    lastModifiedDate?: Date;
  };

  if (typeof withMeta.path !== "string") {
    Object.defineProperty(withMeta, "path", {
      value: `./${file.name}`,
      enumerable: true,
      configurable: true
    });
  }

  if (typeof withMeta.relativePath !== "string") {
    Object.defineProperty(withMeta, "relativePath", {
      value: `./${file.name}`,
      enumerable: true,
      configurable: true
    });
  }

  if (!(withMeta.lastModifiedDate instanceof Date)) {
    Object.defineProperty(withMeta, "lastModifiedDate", {
      value: new Date(file.lastModified),
      enumerable: true,
      configurable: true
    });
  }

  return withMeta;
}

function buildSubmitAssets(assets: CapturedAsset[]): BugReporterSubmitAsset[] {
  return assets.map((asset) => {
    const file = new File([asset.blob], asset.filename, {
      type: asset.mimeType || asset.blob.type || "application/octet-stream",
      lastModified: Date.now()
    });

    return ensureSubmitFileMetadata(file as BugReporterSubmitAsset);
  });
}

export function BugReporterProvider({ config, onSubmit, children }: BugReporterProviderProps) {
  const resolvedConfig = useMemo(() => withDefaults(config), [config]);
  const initialDockSide: DockSide =
    resolvedConfig.theme.position === "bottom-left" || resolvedConfig.theme.position === "top-left" ? "left" : "right";
  const [state, setState] = useState<BugReporterState>(() => ({
    ...BASE_STATE,
    dockSide: initialDockSide,
    attributes: { ...resolvedConfig.attributes }
  }));
  const [sessionActive, setSessionActive] = useState(false);
  const consoleBufferRef = useRef<ConsoleBuffer | null>(null);
  const networkBufferRef = useRef<NetworkBuffer | null>(null);
  const assetsRef = useRef<CapturedAsset[]>([]);

  const resetAssets = useCallback((assets: CapturedAsset[]) => {
    assets.forEach((asset) => revokeObjectUrl(asset.previewUrl));
  }, []);

  const open = useCallback(() => {
    setSessionActive(true);
    setState((prev) => ({
      ...prev,
      isOpen: true,
      error: undefined
    }));
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  const reset = useCallback(() => {
    setSessionActive(false);
    setState((prev) => {
      resetAssets(prev.assets);
      return {
        ...BASE_STATE,
        dockSide: prev.dockSide,
        attributes: { ...resolvedConfig.attributes },
        isOpen: prev.isOpen
      };
    });

    consoleBufferRef.current?.clear();
    networkBufferRef.current?.clear();
  }, [resetAssets, resolvedConfig.attributes]);

  const setStep = useCallback((step: FlowStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const setDockSide = useCallback((dockSide: DockSide) => {
    setState((prev) => ({ ...prev, dockSide }));
  }, []);

  const updateDraft = useCallback((next: Partial<ReportDraft>) => {
    setState((prev) => ({
      ...prev,
      draft: {
        ...prev.draft,
        ...next
      }
    }));
  }, []);

  const setAttributes = useCallback((next: Record<string, unknown>) => {
    setState((prev) => ({
      ...prev,
      attributes: next
    }));
  }, []);

  const updateAttribute = useCallback((key: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [key]: value
      }
    }));
  }, []);

  const setAssetByType = useCallback((type: CapturedAsset["type"], next?: CapturedAsset) => {
    setState((prev) => {
      const previous = prev.assets.find((asset) => asset.type === type);
      if (previous) {
        revokeObjectUrl(previous.previewUrl);
      }

      const rest = prev.assets.filter((asset) => asset.type !== type);
      return {
        ...prev,
        assets: next ? [...rest, next] : rest
      };
    });
  }, []);

  const setScreenshot = useCallback((asset?: CapturedAsset) => {
    setAssetByType("screenshot", asset);
  }, [setAssetByType]);

  const setRecording = useCallback((asset?: CapturedAsset) => {
    setAssetByType("recording", asset);
  }, [setAssetByType]);

  const submit = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      step: "submitting",
      isSubmitting: true,
      uploadProgress: 0,
      error: undefined
    }));

    try {
      const logs = resolvedConfig.features.consoleLogs ? consoleBufferRef.current?.snapshot() : undefined;
      const requests = resolvedConfig.features.networkInfo ? networkBufferRef.current?.snapshot() : undefined;
      const diagnostics = collectDiagnostics(resolvedConfig, {
        logs,
        requests
      });

      const reporter: Reporter = await resolveReporter(resolvedConfig.user);

      let response: BugReportResponse | void;
      if (onSubmit) {
        let submitAssets: BugReporterSubmitAsset[];
        try {
          submitAssets = buildSubmitAssets(state.assets);
        } catch (assetTransformError) {
          throw createSubmitError("We couldn't prepare your files for submission. Please try again.", assetTransformError);
        }

        response = await onSubmit({
          issue: {
            title: state.draft.title,
            description: state.draft.description,
            projectId: resolvedConfig.projectId,
            campaignId: resolvedConfig.campaignId,
            environment: resolvedConfig.environment,
            appVersion: resolvedConfig.appVersion
          },
          context: {
            url: diagnostics.url,
            referrer: diagnostics.referrer,
            timestamp: diagnostics.timestamp,
            timezone: diagnostics.timezone,
            viewport: diagnostics.viewport,
            client: {
              browser: diagnostics.browser,
              os: diagnostics.os,
              language: diagnostics.language,
              userAgent: diagnostics.userAgent
            },
            userAgentData: diagnostics.userAgentData,
            logs: diagnostics.logs,
            requests: diagnostics.requests
          },
          reporter,
          attributes: state.attributes,
          assets: submitAssets
        });
      } else {
        response = await submitReport({
          config: resolvedConfig,
          draft: state.draft,
          attributes: state.attributes,
          diagnostics,
          assets: state.assets,
          onUploadProgress: (progress) => {
            setState((prev) => ({ ...prev, uploadProgress: progress }));
          }
        });
      }

      setState((prev) => ({
        ...prev,
        diagnostics,
        isSubmitting: false,
        uploadProgress: 1,
        step: "success"
      }));

      try {
        resolvedConfig.hooks.onSuccess?.(response ?? {});
      } catch (hookError) {
        console.warn("[bug-reporter] onSuccess hook threw an error", hookError);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected submit failure.";
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        step: "review",
        error: message
      }));
      try {
        resolvedConfig.hooks.onError?.(error as any);
      } catch (hookError) {
        console.warn("[bug-reporter] onError hook threw an error", hookError);
      }
    }
  }, [onSubmit, resolvedConfig, state.assets, state.attributes, state.draft]);

  const retrySubmit = useCallback(async () => {
    await submit();
  }, [submit]);

  const getDiagnosticsPreview = useCallback((): DiagnosticsPreview => {
    const logs = resolvedConfig.features.consoleLogs ? consoleBufferRef.current?.snapshot() ?? [] : [];
    const requests = resolvedConfig.features.networkInfo ? networkBufferRef.current?.snapshot() ?? [] : [];

    return {
      errorLogs: logs.filter((entry) => entry.level === "error"),
      failedRequests: requests.filter((request) => Boolean(request.error) || request.ok === false || (request.status ?? 0) >= 400)
    };
  }, [resolvedConfig.features.consoleLogs, resolvedConfig.features.networkInfo]);

  useEffect(() => {
    if (!sessionActive) {
      return;
    }

    let consoleBuffer: ConsoleBuffer | null = null;
    let networkBuffer: NetworkBuffer | null = null;

    if (resolvedConfig.features.consoleLogs) {
      consoleBuffer = new ConsoleBuffer(resolvedConfig.diagnostics.consoleBufferSize);
      consoleBuffer.install();
      consoleBufferRef.current = consoleBuffer;
    }

    if (resolvedConfig.features.networkInfo) {
      networkBuffer = new NetworkBuffer(resolvedConfig.diagnostics.requestBufferSize);
      networkBuffer.install();
      networkBufferRef.current = networkBuffer;
    }

    return () => {
      consoleBuffer?.uninstall();
      networkBuffer?.uninstall();
      consoleBufferRef.current = null;
      networkBufferRef.current = null;
    };
  }, [
    sessionActive,
    resolvedConfig.diagnostics.consoleBufferSize,
    resolvedConfig.diagnostics.requestBufferSize,
    resolvedConfig.features.consoleLogs,
    resolvedConfig.features.networkInfo
  ]);

  useEffect(() => {
    assetsRef.current = state.assets;
  }, [state.assets]);

  useEffect(() => {
    return () => {
      resetAssets(assetsRef.current);
      consoleBufferRef.current?.uninstall();
      networkBufferRef.current?.uninstall();
    };
  }, [resetAssets]);

  const value = useMemo<BugReporterContextValue>(
    () => ({
      config: resolvedConfig,
      state,
      open,
      close,
      reset,
      setDockSide,
      setStep,
      updateDraft,
      setAttributes,
      updateAttribute,
      setScreenshot,
      setRecording,
      submit,
      retrySubmit,
      getDiagnosticsPreview
    }),
    [
      resolvedConfig,
      state,
      open,
      close,
      reset,
      setDockSide,
      setStep,
      updateDraft,
      setAttributes,
      updateAttribute,
      setScreenshot,
      setRecording,
      submit,
      retrySubmit,
      getDiagnosticsPreview
    ]
  );

  return <BugReporterContext.Provider value={value}>{children}</BugReporterContext.Provider>;
}
