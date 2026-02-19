import ts from "typescript";
import { describe, expect, it } from "vitest";

function transpile(code: string): string {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020
    },
    reportDiagnostics: true
  });

  const diagnostics = result.diagnostics ?? [];
  const errors = diagnostics.filter((diag) => diag.category === ts.DiagnosticCategory.Error);
  expect(errors.length).toBe(0);

  return result.outputText;
}

describe("framework compatibility snippets", () => {
  it("transpiles Next.js App Router usage", () => {
    const output = transpile(`
      "use client";
      import { BugReporter } from "@fogg/bug-reporter";
      export function Reporter() {
        return <BugReporter config={{ apiEndpoint: "/api/report", storage: { mode: "proxy", proxy: { uploadEndpoint: "/api/assets" } } }} />;
      }
    `);
    expect(output).toContain("BugReporter");
  });

  it("transpiles Vite/CRA/Remix-style usage", () => {
    const output = transpile(`
      import { BugReporter, BugReporterProvider, useBugReporter } from "@fogg/bug-reporter";
      function Child(){ const api = useBugReporter(); return <button onClick={api.open}>Open</button>; }
      export function App() {
        return <BugReporter config={{ apiEndpoint: "/api/report", storage: { mode: "proxy", proxy: { uploadEndpoint: "/api/assets" } } }} />;
      }
      export function Advanced() {
        return <BugReporterProvider config={{ apiEndpoint: "/api/report", storage: { mode: "proxy", proxy: { uploadEndpoint: "/api/assets" } } }}><Child /></BugReporterProvider>;
      }
    `);
    expect(output).toContain("useBugReporter");
  });
});
