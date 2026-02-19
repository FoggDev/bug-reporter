# Quickstart

1. Install: `npm install @fogg/bug-reporter`
2. Add component near app root.
3. Configure API and storage mode.

```tsx
import { BugReporter } from "@fogg/bug-reporter";
import "@fogg/bug-reporter/styles.css";

<BugReporter
  config={{
    apiEndpoint: "https://api.example.com/bug-reports",
    projectId: "web-app",
    appVersion: "1.2.0",
    environment: "production",
    storage: {
      mode: "s3-presigned",
      s3: {
        presignEndpoint: "https://api.example.com/bug-assets/presign",
        publicBaseUrl: "https://cdn.example.com"
      }
    }
  }}
/>;
```
