# Next.js (App Router)

Use in a client component:

```tsx
"use client";

import { BugReporter } from "@fogg/bug-reporter";
import "@fogg/bug-reporter/styles.css";

export function BugReporterMount() {
  return <BugReporter config={{ apiEndpoint: "/api/bug-reports", storage: { mode: "proxy", proxy: { uploadEndpoint: "/api/bug-assets" } } }} />;
}
```

Render this component in `app/layout.tsx` or a global client wrapper.
