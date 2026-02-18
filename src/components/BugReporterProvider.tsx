
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
import { submitReport } from "../core/submit";
import { revokeObjectUrl } from "../core/utils";
import type {
  BugReporterConfig,
  BugReporterContextValue,
  BugReporterState,
  CapturedAsset,
  DiagnosticsPreview,
  FlowStep,
  ReportDraft
} from "../types";

type BugReporterProviderProps = PropsWithChildren<{
  config: BugReporterConfig;
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
  step: "describe",
  draft: EMPTY_DRAFT,
  attributes: {},
  assets: [],
  uploadProgress: 0,
  isSubmitting: false,
  error: undefined
};

export function BugReporterProvider({ config, children }: BugReporterProviderProps) {
  const resolvedConfig = useMemo(() => withDefaults(config), [config]);
  const [state, setState] = useState<BugReporterState>(() => ({
    ...BASE_STATE,
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

      const response = await submitReport({
        config: resolvedConfig,
        draft: state.draft,
        attributes: state.attributes,
        diagnostics,
        assets: state.assets,
        onUploadProgress: (progress) => {
          setState((prev) => ({ ...prev, uploadProgress: progress }));
        }
      });

      setState((prev) => ({
        ...prev,
        diagnostics,
        isSubmitting: false,
        uploadProgress: 1,
        step: "success"
      }));

      resolvedConfig.hooks.onSuccess?.(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected submit failure.";
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        step: "review",
        error: message
      }));
      resolvedConfig.hooks.onError?.(error as any);
    }
  }, [resolvedConfig, state.assets, state.attributes, state.draft]);

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
