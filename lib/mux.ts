import Mux from "@mux/mux-node";

if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
  console.warn(
    "Warning: MUX_TOKEN_ID and MUX_TOKEN_SECRET are not set. Mux integration will not work."
  );
}

// Initialize Mux client
export const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID || "",
  tokenSecret: process.env.MUX_TOKEN_SECRET || "",
});

/**
 * Create a direct upload URL for uploading videos to Mux
 * @param corsOrigin - The origin to allow CORS from (e.g., https://portal28.academy)
 * @returns Upload URL and upload ID
 */
export async function createDirectUpload(corsOrigin: string) {
  try {
    const upload = await muxClient.video.uploads.create({
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: ["signed"], // Require signed URLs for playback
        encoding_tier: "baseline",
      },
    });

    return {
      uploadUrl: upload.url,
      uploadId: upload.id,
    };
  } catch (error) {
    console.error("Failed to create Mux direct upload:", error);
    throw new Error("Failed to create Mux upload");
  }
}

/**
 * Get asset details by asset ID
 */
export async function getAsset(assetId: string) {
  try {
    const asset = await muxClient.video.assets.retrieve(assetId);
    return asset;
  } catch (error) {
    console.error("Failed to get Mux asset:", error);
    throw new Error("Failed to get Mux asset");
  }
}

/**
 * Create a signed playback URL for a playback ID
 * @param playbackId - The Mux playback ID
 * @param expiresIn - Time in seconds until the URL expires (default: 1 hour)
 * @returns Signed playback token
 */
export function createPlaybackToken(
  playbackId: string,
  expiresIn: number = 3600
): string {
  if (!process.env.MUX_SIGNING_KEY_ID || !process.env.MUX_SIGNING_PRIVATE_KEY) {
    throw new Error(
      "MUX_SIGNING_KEY_ID and MUX_SIGNING_PRIVATE_KEY must be set to use signed playback"
    );
  }

  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    {
      sub: playbackId,
      aud: "v", // Video audience
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    },
    Buffer.from(process.env.MUX_SIGNING_PRIVATE_KEY, "base64"),
    {
      keyid: process.env.MUX_SIGNING_KEY_ID,
      algorithm: "RS256",
    }
  );

  return token;
}

/**
 * Delete an asset from Mux
 */
export async function deleteAsset(assetId: string) {
  try {
    await muxClient.video.assets.delete(assetId);
  } catch (error) {
    console.error("Failed to delete Mux asset:", error);
    throw new Error("Failed to delete Mux asset");
  }
}

/**
 * Get upload status
 */
export async function getUploadStatus(uploadId: string) {
  try {
    const upload = await muxClient.video.uploads.retrieve(uploadId);
    return upload;
  } catch (error) {
    console.error("Failed to get Mux upload status:", error);
    throw new Error("Failed to get upload status");
  }
}
