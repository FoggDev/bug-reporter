import { BugReporterError } from "../types";
import type {
  BugReportPayload,
  BugReportResponse,
  CapturedAsset,
  DiagnosticsSnapshot,
  ReportDraft,
  RequiredBugReporterConfig
} from "../types";
import { createStorageProvider } from "../storage";
import { uploadAssets } from "./upload";

type SubmitReportOptions = {
  config: RequiredBugReporterConfig;
  draft: ReportDraft;
  attributes: Record<string, unknown>;
  diagnostics: DiagnosticsSnapshot;
  assets: CapturedAsset[];
  onUploadProgress?: (progress: number) => void;
};

export async function submitReport(options: SubmitReportOptions): Promise<BugReportResponse> {
  const provider = createStorageProvider(options.config);
  const assetReferences = await uploadAssets({
    provider,
    assets: options.assets,
    retries: 2,
    onProgress: options.onUploadProgress
  });

  const payloadBase: BugReportPayload = {
    issue: {
      title: options.draft.title,
      description: options.draft.description,
      projectId: options.config.projectId,
      environment: options.config.environment,
      appVersion: options.config.appVersion,
      assets: assetReferences
    },
    context: {
      url: options.diagnostics.url,
      referrer: options.diagnostics.referrer,
      timestamp: options.diagnostics.timestamp,
      timezone: options.diagnostics.timezone,
      viewport: options.diagnostics.viewport,
      client: {
        browser: options.diagnostics.browser,
        os: options.diagnostics.os,
        language: options.diagnostics.language,
        userAgent: options.diagnostics.userAgent
      },
      userAgentData: options.diagnostics.userAgentData,
      performance: {
        navigationTiming: options.diagnostics.navigationTiming
      },
      logs: options.diagnostics.logs,
      requests: options.diagnostics.requests
    },
    reporter: {
      id: options.config.user?.id,
      name: options.config.user?.name,
      email: options.config.user?.email,
      role: options.config.user?.role,
      ip: options.config.user?.ip,
      anonymous: options.config.user?.anonymous ?? !(options.config.user?.id || options.config.user?.email || options.config.user?.name)
    },
    attributes: options.attributes
  };

  const transformed = options.config.hooks.beforeSubmit ? await options.config.hooks.beforeSubmit(payloadBase) : payloadBase;
  if (!transformed) {
    throw new BugReporterError("ABORTED", "Submission aborted by beforeSubmit hook.");
  }

  console.log("[bug-reporter] payload to submit", transformed);
  console.log("[bug-reporter] payload to submit (json)", JSON.stringify(transformed, null, 2));

  const response = await fetch(options.config.apiEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...options.config.auth.headers
    },
    credentials: options.config.auth.withCredentials ? "include" : "same-origin",
    body: JSON.stringify(transformed)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new BugReporterError("SUBMIT_ERROR", `Report submit failed (${response.status}): ${body || response.statusText}`);
  }

  return (await response.json()) as BugReportResponse;
}
