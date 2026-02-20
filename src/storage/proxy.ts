import { BugReporterError } from "../types";
import type { AssetReference, StorageProvider, UploadFile, UploadInstruction } from "../types";

type ProxyProviderOptions = {
  uploadEndpoint: string;
  authHeaders?: Record<string, string>;
  withCredentials?: boolean;
};

export class ProxyProvider implements StorageProvider {
  constructor(private readonly options: ProxyProviderOptions) {}

  private async readUploadResponse(response: Response): Promise<{ url?: string; key?: string }> {
    try {
      return (await response.json()) as { url?: string; key?: string };
    } catch {
      return {};
    }
  }

  async prepareUploads(files: UploadFile[]): Promise<UploadInstruction[]> {
    return files.map((file) => ({
      id: file.id,
      method: "POST",
      uploadUrl: this.options.uploadEndpoint,
      headers: this.options.authHeaders,
      type: file.type
    }));
  }

  async upload(instruction: UploadInstruction, blob: Blob, onProgress?: (progress: number) => void): Promise<AssetReference> {
    onProgress?.(0);
    let response: Response;
    try {
      response = await fetch(instruction.uploadUrl, {
        method: "POST",
        headers: {
          "content-type": blob.type || "application/octet-stream",
          "x-bug-reporter-asset-id": instruction.id,
          "x-bug-reporter-asset-type": instruction.type,
          ...instruction.headers
        },
        credentials: this.options.withCredentials ? "include" : "same-origin",
        body: blob
      });
    } catch (error) {
      throw new BugReporterError("UPLOAD_ERROR", "We couldn't upload your screenshot/video right now. Please try again.", error);
    }

    if (!response.ok) {
      throw new BugReporterError("UPLOAD_ERROR", "We couldn't upload your screenshot/video right now. Please try again.");
    }

    const payload = await this.readUploadResponse(response);
    if (!payload.url) {
      throw new BugReporterError("UPLOAD_ERROR", "Upload service returned an invalid response. Please try again.");
    }
    onProgress?.(1);

    return {
      id: instruction.id,
      type: instruction.type,
      url: payload.url,
      key: payload.key,
      mimeType: blob.type,
      size: blob.size
    };
  }
}
