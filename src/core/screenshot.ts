import { BugReporterError } from "../types";
import html2canvas from "html2canvas";

type CaptureOptions = {
  maskSelectors: string[];
  redactTextPatterns: Array<string | RegExp>;
};

type SelectionRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function applyMasking(selectors: string[]): Array<{ element: HTMLElement; previous: string }> {
  const masked: Array<{ element: HTMLElement; previous: string }> = [];
  for (const selector of selectors) {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      masked.push({ element, previous: element.style.filter });
      element.style.filter = "blur(12px)";
    });
  }
  return masked;
}

function resetMasking(masked: Array<{ element: HTMLElement; previous: string }>): void {
  masked.forEach(({ element, previous }) => {
    element.style.filter = previous;
  });
}

function scrubText(root: HTMLElement, patterns: Array<string | RegExp>): Array<{ node: Text; previous: string }> {
  if (!patterns.length) {
    return [];
  }

  const walkers: Array<{ node: Text; previous: string }> = [];
  const regexes = patterns.map((pattern) => (typeof pattern === "string" ? new RegExp(pattern, "g") : pattern));
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode as Text;
    let replaced = text.textContent ?? "";
    for (const regex of regexes) {
      replaced = replaced.replace(regex, "[redacted]");
    }
    if (replaced !== text.textContent) {
      walkers.push({ node: text, previous: text.textContent ?? "" });
      text.textContent = replaced;
    }
  }
  return walkers;
}

function restoreText(changed: Array<{ node: Text; previous: string }>): void {
  changed.forEach(({ node, previous }) => {
    node.textContent = previous;
  });
}

function createSelectionOverlay(): Promise<SelectionRect> {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-bug-reporter-overlay", "true");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.35)";
    overlay.style.cursor = "crosshair";
    overlay.style.zIndex = "2147483647";

    const box = document.createElement("div");
    box.style.position = "fixed";
    box.style.border = "2px solid #ffffff";
    box.style.background = "rgba(27, 116, 228, 0.2)";
    box.style.pointerEvents = "none";
    box.style.display = "none";
    overlay.appendChild(box);

    const cleanup = () => {
      overlay.removeEventListener("mousedown", onMouseDown);
      overlay.removeEventListener("mousemove", onMouseMove);
      overlay.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDown);
      overlay.remove();
    };

    let startX = 0;
    let startY = 0;
    let isDragging = false;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cleanup();
        reject(new BugReporterError("ABORTED", "Screenshot capture cancelled."));
      }
    };

    const onMouseDown = (event: MouseEvent) => {
      isDragging = true;
      startX = event.clientX;
      startY = event.clientY;
      box.style.display = "block";
      box.style.left = `${startX}px`;
      box.style.top = `${startY}px`;
      box.style.width = "0px";
      box.style.height = "0px";
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isDragging) {
        return;
      }
      const left = Math.min(startX, event.clientX);
      const top = Math.min(startY, event.clientY);
      const width = Math.abs(startX - event.clientX);
      const height = Math.abs(startY - event.clientY);
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
    };

    const onMouseUp = (event: MouseEvent) => {
      if (!isDragging) {
        return;
      }
      isDragging = false;
      const left = Math.min(startX, event.clientX);
      const top = Math.min(startY, event.clientY);
      const width = Math.abs(startX - event.clientX);
      const height = Math.abs(startY - event.clientY);
      cleanup();
      if (width < 8 || height < 8) {
        reject(new BugReporterError("CAPTURE_ERROR", "Selection area is too small."));
        return;
      }
      resolve({ left, top, width, height });
    };

    overlay.addEventListener("mousedown", onMouseDown);
    overlay.addEventListener("mousemove", onMouseMove);
    overlay.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDown);
    document.body.appendChild(overlay);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new BugReporterError("CAPTURE_ERROR", "Failed to build screenshot blob."));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function captureScreenshotArea(options: CaptureOptions): Promise<Blob> {
  const selection = await createSelectionOverlay();
  const masked = applyMasking(options.maskSelectors);
  const textChanges = scrubText(document.body, options.redactTextPatterns);

  try {
    const baseCanvas = await html2canvas(document.documentElement, {
      useCORS: true,
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      backgroundColor: null,
      logging: false,
      windowWidth: document.documentElement.scrollWidth,
      windowHeight: document.documentElement.scrollHeight
    });

    const scaleX = baseCanvas.width / window.innerWidth;
    const scaleY = baseCanvas.height / window.innerHeight;

    const sx = Math.round(selection.left * scaleX);
    const sy = Math.round(selection.top * scaleY);
    const sw = Math.round(selection.width * scaleX);
    const sh = Math.round(selection.height * scaleY);

    const cropped = document.createElement("canvas");
    cropped.width = sw;
    cropped.height = sh;

    const context = cropped.getContext("2d");
    if (!context) {
      throw new BugReporterError("CAPTURE_ERROR", "Canvas 2D context unavailable.");
    }

    context.drawImage(baseCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    return await canvasToBlob(cropped);
  } catch (error) {
    if (error instanceof BugReporterError) {
      throw error;
    }
    throw new BugReporterError("CAPTURE_ERROR", "Screenshot capture failed.", error);
  } finally {
    resetMasking(masked);
    restoreText(textChanges);
  }
}
