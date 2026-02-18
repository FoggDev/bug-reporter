import type { BugReporterConfig, RequiredBugReporterConfig } from "../types";

const DEFAULT_MASK_SELECTORS = [
  "input[type='password']",
  "[data-bug-reporter-mask='true']"
];

export function withDefaults(config: BugReporterConfig): RequiredBugReporterConfig {
  return {
    apiEndpoint: config.apiEndpoint,
    projectId: config.projectId,
    appVersion: config.appVersion,
    environment: config.environment,
    storage: {
      mode: config.storage?.mode ?? "proxy",
      s3: config.storage?.s3,
      local: config.storage?.local,
      proxy: config.storage?.proxy,
      limits: {
        maxVideoSeconds: config.storage?.limits?.maxVideoSeconds ?? 30,
        maxVideoBytes: config.storage?.limits?.maxVideoBytes ?? 50 * 1024 * 1024,
        maxScreenshotBytes: config.storage?.limits?.maxScreenshotBytes ?? 8 * 1024 * 1024
      }
    },
    auth: {
      headers: config.auth?.headers ?? {},
      withCredentials: config.auth?.withCredentials ?? false
    },
    theme: {
      primaryColor: config.theme?.primaryColor ?? "#1b74e4",
      position: config.theme?.position ?? "bottom-right",
      zIndex: config.theme?.zIndex ?? 2147483000,
      borderRadius: config.theme?.borderRadius ?? "999px"
    },
    features: {
      screenshot: config.features?.screenshot ?? true,
      recording: config.features?.recording ?? true,
      annotations: config.features?.annotations ?? true,
      consoleLogs: config.features?.consoleLogs ?? false,
      networkInfo: config.features?.networkInfo ?? false
    },
    user: config.user,
    attributes: config.attributes ?? {},
    privacy: {
      maskSelectors: config.privacy?.maskSelectors ?? DEFAULT_MASK_SELECTORS,
      redactTextPatterns: config.privacy?.redactTextPatterns ?? []
    },
    diagnostics: {
      consoleBufferSize: config.diagnostics?.consoleBufferSize ?? 100,
      requestBufferSize: config.diagnostics?.requestBufferSize ?? 200
    },
    hooks: {
      beforeSubmit: config.hooks?.beforeSubmit,
      onSuccess: config.hooks?.onSuccess,
      onError: config.hooks?.onError
    }
  };
}
