# bug-reporter

`bug-reporter` is a React 16.8+ SDK for collecting production bug reports with screenshot capture, short screen recording, diagnostics, and pluggable storage backends.

## Install

```bash
npm install bug-reporter
```

## Quickstart

```tsx
import { BugReporter } from "bug-reporter";
import "bug-reporter/styles.css";

export function App() {
  return (
    <BugReporter
      config={{
        apiEndpoint: "/api/bug-reports",
        storage: {
          mode: "local-public",
          local: { uploadEndpoint: "/api/uploads" }
        }
      }}
    />
  );
}
```

## Capture Console Errors and Requests

Enable these flags in config to attach logs and request traces to each report:

```tsx
<BugReporter
  config={{
    apiEndpoint: "/api/bug-reports",
    storage: { mode: "proxy", proxy: { uploadEndpoint: "/api/bug-assets" } },
    features: {
      consoleLogs: true,
      networkInfo: true
    },
    diagnostics: {
      consoleBufferSize: 200,
      requestBufferSize: 300
    }
  }}
/>
```

## Docs

- `docs/quickstart.md`
- `docs/framework-nextjs.md`
- `docs/framework-vite.md`
- `docs/framework-cra.md`
- `docs/framework-remix.md`
- `docs/backend-s3.md`
- `docs/backend-local.md`
- `docs/security.md`
- `docs/browser-compatibility.md`
- `docs/known-limitations.md`

## Development

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

## Local Sandbox (Vite)

```bash
npm run sandbox:vite
```

Sandbox app path: `examples/sandbox-vite`.

## License

MIT
