# Vite

```tsx
import { BugReporter } from "@fogg/bug-reporter";
import "@fogg/bug-reporter/styles.css";

export function App() {
  return (
    <>
      <BugReporter
        config={{
          apiEndpoint: "/api/bug-reports",
          storage: { mode: "local-public", local: { uploadEndpoint: "/api/uploads" } }
        }}
      />
    </>
  );
}
```

No framework-specific setup is required.
