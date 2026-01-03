/**
 * S3/R2 File Storage Utility
 * 
 * Supports both AWS S3 and Cloudflare R2 (S3-compatible)
 * 
 * Required env vars:
 * - S3_ACCESS_KEY_ID
 * - S3_SECRET_ACCESS_KEY
 * - S3_BUCKET_NAME
 * - S3_REGION (default: auto)
 * - S3_ENDPOINT (for R2: https://<account_id>.r2.cloudflarestorage.com)
 */

import { createHmac, createHash } from "crypto";

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region: string;
  endpoint?: string;
}

interface SignedUrlOptions {
  key: string;
  expiresIn?: number; // seconds, default 3600
  contentType?: string;
  method?: "GET" | "PUT";
}

interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

function getConfig(): S3Config {
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.S3_REGION || "auto";
  const endpoint = process.env.S3_ENDPOINT;

  if (!accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "S3 storage not configured. Required: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME"
    );
  }

  return { accessKeyId, secretAccessKey, bucket, region, endpoint };
}

function isConfigured(): boolean {
  return !!(
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET_NAME
  );
}

function getBaseUrl(config: S3Config): string {
  if (config.endpoint) {
    // R2 or custom endpoint
    return `${config.endpoint}/${config.bucket}`;
  }
  // AWS S3
  return `https://${config.bucket}.s3.${config.region}.amazonaws.com`;
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function getSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  return kSigning;
}

/**
 * Generate a presigned URL for uploading or downloading
 */
export function getSignedUrl(options: SignedUrlOptions): string {
  const config = getConfig();
  const { key, expiresIn = 3600, contentType, method = "GET" } = options;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  
  const host = config.endpoint
    ? new URL(config.endpoint).host
    : `${config.bucket}.s3.${config.region}.amazonaws.com`;
  
  const canonicalUri = `/${key}`;
  const service = "s3";
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const credential = `${config.accessKeyId}/${credentialScope}`;

  // Build query string
  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": algorithm,
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": "host",
  };

  if (contentType && method === "PUT") {
    queryParams["Content-Type"] = contentType;
  }

  const sortedParams = Object.keys(queryParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
    .join("&");

  // Canonical request
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const payloadHash = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    method,
    canonicalUri,
    sortedParams,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // String to sign
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  // Sign
  const signingKey = getSigningKey(
    config.secretAccessKey,
    dateStamp,
    config.region,
    service
  );
  const signature = hmacSha256(signingKey, stringToSign).toString("hex");

  // Build URL
  const protocol = config.endpoint?.startsWith("https") ? "https" : "https";
  const baseUrl = config.endpoint
    ? `${config.endpoint}/${config.bucket}`
    : `https://${config.bucket}.s3.${config.region}.amazonaws.com`;

  return `${baseUrl}${canonicalUri}?${sortedParams}&X-Amz-Signature=${signature}`;
}

/**
 * Generate a presigned URL for file upload
 */
export function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): string {
  return getSignedUrl({ key, contentType, expiresIn, method: "PUT" });
}

/**
 * Generate a presigned URL for file download
 */
export function getDownloadUrl(key: string, expiresIn = 3600): string {
  return getSignedUrl({ key, expiresIn, method: "GET" });
}

/**
 * Generate a unique key for a lesson file
 */
export function generateFileKey(
  lessonId: string,
  filename: string,
  prefix = "lessons"
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${prefix}/${lessonId}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Get public URL for a file (if bucket is public)
 */
export function getPublicUrl(key: string): string {
  const config = getConfig();
  return `${getBaseUrl(config)}/${key}`;
}

/**
 * Check if S3/R2 storage is configured
 */
export { isConfigured };

/**
 * Storage service facade
 */
export const storage = {
  isConfigured,
  getUploadUrl,
  getDownloadUrl,
  getPublicUrl,
  generateFileKey,
  getSignedUrl,
};

export default storage;
