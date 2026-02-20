import { BugReporterError } from "../types";
import type { RequiredBugReporterConfig, StorageProvider } from "../types";
import { LocalPublicProvider } from "./local-public";
import { ProxyProvider } from "./proxy";
import { S3PresignedProvider } from "./s3-presigned";

export function createStorageProvider(config: RequiredBugReporterConfig): StorageProvider {
  if (config.storage.mode === "s3-presigned") {
    const presignEndpoint = config.storage.s3?.presignEndpoint;
    if (!presignEndpoint) {
      throw new BugReporterError("UPLOAD_ERROR", "Screenshot/video upload is not configured. Please contact support.");
    }
    return new S3PresignedProvider({
      presignEndpoint,
      publicBaseUrl: config.storage.s3?.publicBaseUrl,
      authHeaders: config.auth.headers,
      withCredentials: config.auth.withCredentials
    });
  }

  if (config.storage.mode === "local-public") {
    const uploadEndpoint = config.storage.local?.uploadEndpoint;
    if (!uploadEndpoint) {
      throw new BugReporterError("UPLOAD_ERROR", "Screenshot/video upload is not configured. Please contact support.");
    }
    return new LocalPublicProvider({
      uploadEndpoint,
      publicBaseUrl: config.storage.local?.publicBaseUrl,
      authHeaders: config.auth.headers,
      withCredentials: config.auth.withCredentials
    });
  }

  const uploadEndpoint = config.storage.proxy?.uploadEndpoint;
  if (!uploadEndpoint) {
    throw new BugReporterError("UPLOAD_ERROR", "Screenshot/video upload is not configured. Please contact support.");
  }

  return new ProxyProvider({
    uploadEndpoint,
    authHeaders: config.auth.headers,
    withCredentials: config.auth.withCredentials
  });
}
