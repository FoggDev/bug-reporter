import { useState } from "react";
import { BugReporter } from "@fogg/bug-reporter";
import type { BugReportResponse, BugReporterSubmitData, CustomFormProps } from "@fogg/bug-reporter";

declare global {
  interface Window {
    __bugReporterSandboxFetchMocked?: boolean;
  }
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== "string") {
    return undefined;
  }
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

if (!window.__bugReporterSandboxFetchMocked) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (url.includes("/sandbox/upload")) {
      return new Response(
        JSON.stringify({
          url: `https://example.local/assets/${Date.now()}`,
          key: `assets/${Date.now()}`
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    if (url.includes("/sandbox/report")) {
      const payload = parseBody(init?.body);
      console.log("[sandbox] submitted payload", payload);

      return new Response(
        JSON.stringify({
          id: `report-${Date.now()}`,
          message: "Received in sandbox"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    if (url.includes("/sandbox/fake-api-failure")) {
      return new Response(
        JSON.stringify({
          error: "Simulated backend outage"
        }),
        { status: 503, headers: { "content-type": "application/json" } }
      );
    }

    if (url.includes("/sandbox/success-with-bad-data")) {
      return new Response(
        JSON.stringify({
          ok: true,
          payload: null
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    return originalFetch(input, init);
  };
  window.__bugReporterSandboxFetchMocked = true;
}

function SeverityCustomForm({ attributes, updateAttribute }: CustomFormProps) {
  const severityLevel = typeof attributes.severityLevel === "string" ? attributes.severityLevel : "";

  return (
    <label className="br-field">
      What is the severity level?
      <select value={severityLevel} onChange={(event) => updateAttribute("severityLevel", event.target.value)}>
        <option value="" disabled>
          Select severity level
        </option>
        <option value="preventing_release_campaign">Is preventing to release a Campaign</option>
        <option value="campaign_already_live">My campaign is already live</option>
        <option value="campaign_live_in_few_hours">The campaign will be live in a few hours</option>
        <option value="campaign_live_later_today">The campaign will be live later today</option>
      </select>
    </label>
  );
}

export function App() {
  const [scenarioStatus, setScenarioStatus] = useState("No scenario triggered yet.");
  const [submittedAssets, setSubmittedAssets] = useState<BugReporterSubmitData["assets"]>([]);

  const handleReporterSubmit = async (payload: BugReporterSubmitData): Promise<BugReportResponse> => {
    const response = await fetch("/sandbox/report", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Report submit failed (${response.status}).`);
    }

    const result = (await response.json().catch(() => ({}))) as BugReportResponse;
    const submittedTypes = payload.assets.map((asset) => asset.type).join(", ") || "none";
    setScenarioStatus(`Submitted via onSubmit with ${payload.assets.length} base64 asset(s): ${submittedTypes}.`);
    setSubmittedAssets(payload.assets);
    return result;
  };

  const simulateApiFailure = async () => {
    try {
      const response = await fetch("/sandbox/fake-api-failure", { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(`API failure ${response.status}: ${JSON.stringify(body)}`);
      }
    } catch (error) {
      console.error("[sandbox] simulated API failure", error);
      setScenarioStatus("Triggered: fake API failure (503).");
    }
  };

  const simulateConsoleErrors = () => {
    console.error("[sandbox] console error #1: failed to parse widget config.");
    console.error("[sandbox] console error #2", { reason: "Unexpected null value", source: "sandbox-button" });
    console.warn("[sandbox] warning: stale feature flags detected.");
    setScenarioStatus("Triggered: console error burst.");
  };

  const simulate200WithFrontendErrors = async () => {
    try {
      const response = await fetch("/sandbox/success-with-bad-data", { method: "GET" });
      const body = (await response.json()) as { payload?: { items?: Array<{ id: string }> } | null };

      // Intentional frontend processing bug to simulate runtime errors after a 200 response.
      const firstItemId = body.payload!.items![0]!.id;
      console.log("[sandbox] first item id", firstItemId);
    } catch (error) {
      console.error("[sandbox] 200 response but frontend processing failed", error);
      setScenarioStatus("Triggered: 200 response with frontend runtime error.");
    }
  };

  return (
    <div className="page">
      <main className="card">
        <h1>bug-reporter local sandbox</h1>
        <p>
          Use the floating launcher at the bottom-right to test screenshot capture, optional annotation, recording,
          diagnostics, and host-managed submission through <code>onSubmit</code>.
        </p>

        <section className="demo-block">
          <h2>Visible content</h2>
          <p>Use this text to validate screenshot selection and report details.</p>
        </section>

        <section className="demo-block">
          <h2>Scenario buttons</h2>
          <p>Use these to generate reproducible logs and request traces in bug-reporter diagnostics.</p>
          <div className="sandbox-actions">
            <button type="button" className="sandbox-btn" onClick={() => void simulateApiFailure()}>
              Simulate fake API failure
            </button>
            <button type="button" className="sandbox-btn" onClick={simulateConsoleErrors}>
              Simulate console errors
            </button>
            <button type="button" className="sandbox-btn" onClick={() => void simulate200WithFrontendErrors()}>
              Simulate 200 + frontend error
            </button>
          </div>
          <p className="sandbox-status">{scenarioStatus}</p>
        </section>

        <section className="demo-block sensitive" data-bug-reporter-mask="true">
          <h2>Masked region</h2>
          <p>This block should appear blurred in screenshots because of mask selectors.</p>
        </section>

        {submittedAssets.length ? (
          <section className="demo-block">
            <h2>Last submitted assets</h2>
            <p>Rendered from the base64 assets returned in the onSubmit payload.</p>
            {!submittedAssets.some((asset) => asset.type === "recording") ? (
              <p style={{ color: "#b45309", fontWeight: 600 }}>
                No recording asset was submitted. Select Entire Screen and finish the recording before submitting.
              </p>
            ) : null}
            <div style={{ display: "grid", gap: "12px" }}>
              {submittedAssets.map((asset) => (
                <div key={asset.id}>
                  <p>
                    <strong>{asset.type}</strong> - {asset.mimeType}
                  </p>
                  {asset.type === "recording" ? (
                    <video src={asset.base64} controls style={{ width: "100%", maxWidth: "640px", borderRadius: "8px" }} />
                  ) : asset.type === "screenshot" ? (
                    <img
                      src={asset.base64}
                      alt={`${asset.type} preview`}
                      style={{ width: "100%", maxWidth: "640px", borderRadius: "8px" }}
                    />
                  ) : (
                    <a href={asset.base64} download={asset.filename}>
                      Download {asset.filename}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <BugReporter
        CustomForm={SeverityCustomForm}
        themeMode="light"
        buttonColor="#374151"
        describeStepTitle="Report a bug"
        describeStepDescription="Provide enough context so engineers can reproduce what happened."
        onSubmit={handleReporterSubmit}
        config={{
          projectId: "sandbox-vite",
          campaignId: "abc123",
          appVersion: "0.0.1",
          environment: "development",
          features: {
            screenshot: true,
            recording: true,
            recordingEntireScreenOnly: true,
            annotations: true,
            consoleLogs: true,
            networkInfo: true
          },
          diagnostics: {
            consoleBufferSize: 50,
            requestBufferSize: 100
          },
          privacy: {
            maskSelectors: ["[data-bug-reporter-mask='true']", "input[type='password']"]
          }
        }}
      />
    </div>
  );
}
