import { useState } from "react";
import { BugReporter } from "@fogg/bug-reporter";
import type { CustomFormProps } from "@fogg/bug-reporter";

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
          diagnostics, upload flow, and final submission.
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
      </main>

      <BugReporter
        CustomForm={SeverityCustomForm}
        themeMode="light"
        buttonColor="#374151"
        config={{
          apiEndpoint: "/sandbox/report",
          projectId: "sandbox-vite",
          appVersion: "0.0.1",
          environment: "development",
          storage: {
            mode: "proxy",
            proxy: {
              uploadEndpoint: "/sandbox/upload"
            }
          },
          features: {
            screenshot: true,
            recording: true,
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
