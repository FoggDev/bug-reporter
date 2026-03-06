import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BugReporter } from "../../src";
import { BugReporterProvider } from "../../src/components/BugReporterProvider";
import { StepDescribe } from "../../src/components/StepDescribe";
import { useBugReporter } from "../../src/hooks";

function Harness() {
  const reporter = useBugReporter();
  return (
    <div>
      <button type="button" onClick={reporter.open}>
        Open
      </button>
      <button type="button" onClick={() => reporter.updateDraft({ title: "Broken login" })}>
        Draft
      </button>
      <button type="button" onClick={() => reporter.setStep("review")}>
        Review
      </button>
      <button type="button" onClick={() => reporter.setDockSide("top")}>
        DockTop
      </button>
      <button
        type="button"
        onClick={() =>
          reporter.setScreenshot({
            id: "asset-screenshot-1",
            type: "screenshot",
            blob: new Blob(["fake-image"], { type: "image/png" }),
            previewUrl: "",
            mimeType: "image/png",
            filename: "screenshot.png",
            size: 10
          })
        }
      >
        AddScreenshot
      </button>
      <button
        type="button"
        onClick={() =>
          reporter.setRecording({
            id: "asset-recording-1",
            type: "recording",
            blob: new Blob(["fake-video"], { type: "video/webm" }),
            previewUrl: "",
            mimeType: "video/webm",
            filename: "recording.webm",
            size: 10
          })
        }
      >
        AddRecording
      </button>
      <button type="button" onClick={() => void reporter.submit()}>
        Submit
      </button>
      <span data-testid="step">{reporter.state.step}</span>
      <span data-testid="dock-side">{reporter.state.dockSide}</span>
    </div>
  );
}

function ScreenshotSeedButton() {
  const reporter = useBugReporter();

  return (
    <button
      type="button"
      onClick={() =>
        reporter.setScreenshot({
          id: "seeded-screenshot-1",
          type: "screenshot",
          blob: new Blob(["seeded-image"], { type: "image/png" }),
          previewUrl: "blob:seeded-image",
          mimeType: "image/png",
          filename: "seeded.png",
          size: 12
        })
      }
    >
      SeedScreenshot
    </button>
  );
}

async function fillRequiredDescribeFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Title"), "Broken login");
  await user.selectOptions(screen.getByLabelText("What is the severity level?"), "campaign_already_live");
}

describe("BugReporter integration", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/bug-reports")) {
          return new Response(JSON.stringify({ id: "report-1" }), { status: 200, headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({ url: "https://cdn.local/asset" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      })
    );
  });

  it("submits a report through provider API", async () => {
    const user = userEvent.setup();

    render(
      <BugReporterProvider
        config={{
          apiEndpoint: "/api/bug-reports",
          storage: { mode: "proxy", proxy: { uploadEndpoint: "/api/bug-assets" } },
          features: { screenshot: false, recording: false }
        }}
      >
        <Harness />
      </BugReporterProvider>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Draft" }));
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByTestId("step")).toHaveTextContent("success");
    });
  });

  it("updates dock side through provider API", async () => {
    const user = userEvent.setup();

    render(
      <BugReporterProvider
        config={{
          apiEndpoint: "/api/bug-reports",
          storage: { mode: "proxy", proxy: { uploadEndpoint: "/api/bug-assets" } },
          features: { screenshot: false, recording: false },
          theme: { position: "bottom-left" }
        }}
      >
        <Harness />
      </BugReporterProvider>
    );

    expect(screen.getByTestId("dock-side")).toHaveTextContent("left");
    await user.click(screen.getByRole("button", { name: "DockTop" }));
    expect(screen.getByTestId("dock-side")).toHaveTextContent("top");
  });

  it("submits via onSubmit without api/storage endpoints", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => ({ id: "custom-submit-1" }));

    render(
      <BugReporterProvider
        config={{
          features: { screenshot: false, recording: false }
        }}
        onSubmit={onSubmit}
      >
        <Harness />
      </BugReporterProvider>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Draft" }));
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByTestId("step")).toHaveTextContent("success");
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("passes screenshot and recording assets as files in onSubmit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async (_payload: unknown) => ({ id: "custom-submit-assets" }));

    render(
      <BugReporterProvider
        config={{
          features: { screenshot: false, recording: false }
        }}
        onSubmit={onSubmit}
      >
        <Harness />
      </BugReporterProvider>
    );

    await user.click(screen.getByRole("button", { name: "Open" }));
    await user.click(screen.getByRole("button", { name: "Draft" }));
    await user.click(screen.getByRole("button", { name: "AddScreenshot" }));
    await user.click(screen.getByRole("button", { name: "AddRecording" }));
    await user.click(screen.getByRole("button", { name: "Review" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => {
      expect(screen.getByTestId("step")).toHaveTextContent("success");
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0]?.[0] as { assets: File[] };
    expect(payload.assets).toHaveLength(2);

    const screenshotAsset = payload.assets.find((asset) => asset.type === "image/png");
    const recordingAsset = payload.assets.find((asset) => asset.type === "video/webm");

    expect(screenshotAsset).toBeInstanceOf(File);
    expect(recordingAsset).toBeInstanceOf(File);
    expect(screenshotAsset?.name).toBe("screenshot.png");
    expect(recordingAsset?.name).toBe("recording.webm");
    expect((screenshotAsset as File & { relativePath?: string })?.relativePath).toBe("./screenshot.png");
    expect((recordingAsset as File & { relativePath?: string })?.relativePath).toBe("./recording.webm");
  });

  it("hides the screenshot button by default and keeps drag and drop visible", async () => {
    const user = userEvent.setup();

    render(<BugReporter config={{}} />);

    await user.click(screen.getByRole("button", { name: "Open bug reporter" }));

    expect(screen.queryByRole("button", { name: "Screenshot" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record a video" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drag and drop screenshot" })).toBeInTheDocument();
  });

  it("makes the recording control full width when the screenshot button is hidden", async () => {
    const user = userEvent.setup();

    render(<BugReporter config={{}} />);

    await user.click(screen.getByRole("button", { name: "Open bug reporter" }));

    const recordButton = screen.getByRole("button", { name: "Record a video" });
    expect(recordButton.parentElement).toHaveStyle({ flex: "1 1 100%" });
  });

  it("allows hiding the screenshot drop zone independently", async () => {
    const user = userEvent.setup();

    render(<BugReporter config={{}} showScreenshotButton showDragAndDrop={false} />);

    await user.click(screen.getByRole("button", { name: "Open bug reporter" }));

    expect(screen.getByRole("button", { name: "Screenshot" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Drag and drop screenshot" })).not.toBeInTheDocument();
  });

  it("allows continuing when both screenshot inputs are hidden", async () => {
    const user = userEvent.setup();

    render(<BugReporter config={{}} showDragAndDrop={false} />);

    await user.click(screen.getByRole("button", { name: "Open bug reporter" }));
    await fillRequiredDescribeFields(user);

    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("allows continuing with a recording even without a screenshot", async () => {
    const user = userEvent.setup();

    render(
      <BugReporterProvider config={{}}>
        <Harness />
        <StepDescribe
          onNext={() => undefined}
          describeStepTitle="Report a bug"
          describeStepDescription="Provide enough context."
          showScreenshotButton={false}
          showDragAndDrop
        />
      </BugReporterProvider>
    );

    await fillRequiredDescribeFields(user);
    await user.click(screen.getByRole("button", { name: "AddRecording" }));

    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("requires a screenshot when no recording exists", async () => {
    const user = userEvent.setup();

    render(<BugReporter config={{}} />);

    await user.click(screen.getByRole("button", { name: "Open bug reporter" }));
    await fillRequiredDescribeFields(user);

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("requires severity before continuing", async () => {
    const user = userEvent.setup();

    render(
      <BugReporterProvider config={{ features: { screenshot: false, recording: false } }}>
        <StepDescribe
          onNext={() => undefined}
          describeStepTitle="Report a bug"
          describeStepDescription="Provide enough context."
          showScreenshotButton={false}
          showDragAndDrop
        />
      </BugReporterProvider>
    );

    await user.type(screen.getByLabelText("Title"), "Broken login");
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("What is the severity level?"), "campaign_already_live");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("lets the user delete an uploaded screenshot and upload a new one", async () => {
    const user = userEvent.setup();

    render(
      <BugReporterProvider config={{ features: { annotations: false } }}>
        <ScreenshotSeedButton />
        <StepDescribe
          onNext={() => undefined}
          describeStepTitle="Report a bug"
          describeStepDescription="Provide enough context."
          showScreenshotButton={false}
          showDragAndDrop
        />
      </BugReporterProvider>
    );

    await user.click(screen.getByRole("button", { name: "SeedScreenshot" }));
    expect(screen.getByRole("button", { name: "Delete screenshot" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete screenshot" }));
    expect(screen.queryByRole("button", { name: "Delete screenshot" })).not.toBeInTheDocument();
  });
});
