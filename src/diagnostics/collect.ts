import type { DiagnosticsSnapshot, RequiredBugReporterConfig } from "../types";
import { detectBrowserAndOS } from "./ua";

type CollectDiagnosticsOptions = {
  logs?: DiagnosticsSnapshot["logs"];
  requests?: DiagnosticsSnapshot["requests"];
};

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    brands?: ReadonlyArray<{
      brand: string;
      version: string;
    }>;
    mobile?: boolean;
    platform?: string;
  };
};

function getUserAgentDataSnapshot(): DiagnosticsSnapshot["userAgentData"] | undefined {
  const userAgentData = (navigator as NavigatorWithUserAgentData).userAgentData;
  if (!userAgentData) {
    return undefined;
  }

  return {
    brands: userAgentData.brands?.map((item) => ({
      brand: item.brand,
      version: item.version
    })),
    mobile: userAgentData.mobile,
    platform: userAgentData.platform
  };
}

export function collectDiagnostics(
  config: RequiredBugReporterConfig,
  options?: CollectDiagnosticsOptions
): DiagnosticsSnapshot {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const { browser, os } = detectBrowserAndOS(navigator.userAgent);

  return {
    url: window.location.href,
    referrer: document.referrer,
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1
    },
    browser,
    os,
    language: navigator.language,
    userAgent: navigator.userAgent,
    userAgentData: getUserAgentDataSnapshot(),
    appVersion: config.appVersion,
    environment: config.environment,
    projectId: config.projectId,
    logs: options?.logs,
    requests: options?.requests,
    navigationTiming: {
      domComplete: nav?.domComplete,
      loadEventEnd: nav?.loadEventEnd,
      responseEnd: nav?.responseEnd
    }
  };
}
