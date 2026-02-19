# Vite Sandbox

Small local app to manually test the `@fogg/bug-reporter` SDK.

## Run

From repo root:

```bash
npm run sandbox:vite
```

Or directly:

```bash
cd examples/sandbox-vite
npm install
npm run dev
```

The sandbox mocks:
- `POST /sandbox/upload`
- `POST /sandbox/report`

So you can validate the full SDK flow without running a backend.
