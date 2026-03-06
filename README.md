# bug-reporter

`@fogg/bug-reporter` is a React 16.8+ SDK for collecting production bug reports with screenshot capture, short screen recording, diagnostics, and pluggable storage backends.

## Install

```bash
npm install @fogg/bug-reporter
```

## Quickstart

```tsx
import { BugReporter } from "@fogg/bug-reporter";
import "@fogg/bug-reporter/styles.css";

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

## UI Visibility

Use component props to control the screenshot button and screenshot upload drop zone independently.

```tsx
<BugReporter
  config={{
    features: { screenshot: true, recording: true }
  }}
  showScreenshotButton={false}
  showDragAndDrop={true}
/>
```

Defaults:

- `showScreenshotButton`: `false`
- `showDragAndDrop`: `true`

## Controlled Submit (No SDK Endpoints)

If you prefer to handle uploads/submission yourself, pass `onSubmit`.  
`onSubmit` receives issue/context/reporter data and `assets` as data URLs (`base64`) for both screenshots and recordings.

```tsx
import { BugReporter } from "@fogg/bug-reporter";
import type { BugReporterSubmitData } from "@fogg/bug-reporter";

async function handleSubmit(payload: BugReporterSubmitData) {
  // Every asset includes a base64 data URL.
  console.log("title", payload.issue.title);
  console.log("assets", payload.assets);

  payload.assets.forEach((asset) => {
    console.log(asset.type, asset.base64.slice(0, 64));
  });
}

export function App() {
  return (
    <BugReporter
      config={{
        features: { screenshot: true, recording: true }
      }}
      onSubmit={handleSubmit}
    />
  );
}
```

To prefer full-screen-only capture for recordings:

```tsx
<BugReporter
  config={{
    features: {
      recording: true,
      recordingEntireScreenOnly: true
    }
  }}
/>
```

If you need screenshots to include cross-origin iframe areas, enable picker fallback explicitly:

```tsx
<BugReporter
  config={{
    features: {
      screenshot: true,
      screenshotCrossOriginFallback: true
    }
  }}
/>
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

## S3 Storage Example

Use this when your backend returns presigned upload URLs.

```tsx
import { BugReporter } from "@fogg/bug-reporter";
import "@fogg/bug-reporter/styles.css";

export function App() {
  return (
    <BugReporter
      config={{
        apiEndpoint: "https://api.example.com/bug-reports",
        projectId: "web-app",
        environment: "production",
        storage: {
          mode: "s3-presigned",
          s3: {
            presignEndpoint: "https://api.example.com/bug-assets/presign",
            publicBaseUrl: "https://cdn.example.com"
          }
        }
      }}
    />
  );
}
```

See `docs/backend-s3.md` for the backend request/response contract.

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

## Publish To npm

1. Login to npm:
```bash
npm login
```
2. Verify quality/build locally:
```bash
npm run release:verify
```
3. Verify package contents before publishing:
```bash
npm run publish:dry-run
```
4. Publish `@fogg/bug-reporter`:
```bash
npm run publish:npm
```

### Changesets workflow

For versioned releases with Changesets:
```bash
npm run changeset
npm run version:packages
npm run release
```

## License

MIT
