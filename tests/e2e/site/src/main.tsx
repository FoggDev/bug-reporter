import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BugReporter } from "@fogg/bug-reporter";

const originalFetch = window.fetch.bind(window);
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  if (url.includes("/api/bug-reports")) {
    return new Response(JSON.stringify({ id: "e2e-report" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }

  if (url.includes("/api/bug-assets")) {
    return new Response(JSON.stringify({ url: "https://example.local/assets/demo" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }

  return originalFetch(input, init);
};

function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem" }}>
      <h1>Bug Reporter E2E Harness</h1>
      <BugReporter
        config={{
          apiEndpoint: "/api/bug-reports",
          storage: { mode: "proxy", proxy: { uploadEndpoint: "/api/bug-assets" } },
          features: { screenshot: false, recording: false }
        }}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
