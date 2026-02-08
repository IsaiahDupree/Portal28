/**
 * Meta Custom Audiences API Integration
 * META-007: Configure custom audiences based on user behavior
 *
 * This module provides utilities to:
 * - Create custom audiences in Meta
 * - Upload user data (hashed emails) to audiences
 * - Manage audience lifecycle
 */

import crypto from "crypto";

// SHA256 hash for PII (Meta requirement)
function sha256(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

interface CreateAudienceParams {
  name: string;
  description?: string;
  pixelId?: string;
}

interface AddUsersParams {
  audienceId: string;
  emails: string[];
  pixelId?: string;
}

interface RemoveUsersParams {
  audienceId: string;
  emails: string[];
  pixelId?: string;
}

interface AudienceResponse {
  id: string;
  name: string;
  approximate_count?: number;
}

/**
 * Create a new custom audience in Meta
 * @returns Meta audience ID
 */
export async function createCustomAudience(
  params: CreateAudienceParams
): Promise<string> {
  const pixelId = params.pixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID!;
  const token = process.env.META_CAPI_ACCESS_TOKEN!;
  const adAccountId = process.env.META_AD_ACCOUNT_ID!;
  const version = process.env.META_API_VERSION || "v20.0";

  if (!pixelId || !token || !adAccountId) {
    throw new Error(
      "Missing Meta credentials: NEXT_PUBLIC_META_PIXEL_ID, META_CAPI_ACCESS_TOKEN, or META_AD_ACCOUNT_ID"
    );
  }

  // Create custom audience using Meta Marketing API
  const response = await fetch(
    `https://graph.facebook.com/${version}/act_${adAccountId}/customaudiences`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: params.name,
        description: params.description || "",
        subtype: "CUSTOM", // CUSTOM, WEBSITE, APP, OFFLINE_CONVERSION, etc.
        customer_file_source: "USER_PROVIDED_ONLY",
        access_token: token,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create custom audience: ${error}`);
  }

  const data = (await response.json()) as AudienceResponse;
  return data.id;
}

/**
 * Add users to an existing custom audience
 * @param params - Audience ID and user emails
 * @returns Number of users added
 */
export async function addUsersToAudience(
  params: AddUsersParams
): Promise<number> {
  const pixelId = params.pixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID!;
  const token = process.env.META_CAPI_ACCESS_TOKEN!;
  const version = process.env.META_API_VERSION || "v20.0";

  if (!pixelId || !token) {
    throw new Error(
      "Missing Meta credentials: NEXT_PUBLIC_META_PIXEL_ID or META_CAPI_ACCESS_TOKEN"
    );
  }

  // Hash emails for privacy (Meta requirement)
  const hashedEmails = params.emails.map((email) => sha256(email));

  // Batch upload users (Meta allows batches of up to 10,000)
  const batchSize = 10000;
  let totalAdded = 0;

  for (let i = 0; i < hashedEmails.length; i += batchSize) {
    const batch = hashedEmails.slice(i, i + batchSize);

    const response = await fetch(
      `https://graph.facebook.com/${version}/${params.audienceId}/users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: {
            schema: ["EMAIL"], // We're using email as the identifier
            data: batch.map((hash) => [hash]), // Each user is [email_hash]
          },
          access_token: token,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add users to audience: ${error}`);
    }

    const result = await response.json();
    totalAdded += result.num_received || batch.length;
  }

  return totalAdded;
}

/**
 * Remove users from a custom audience
 * @param params - Audience ID and user emails
 * @returns Number of users removed
 */
export async function removeUsersFromAudience(
  params: RemoveUsersParams
): Promise<number> {
  const pixelId = params.pixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID!;
  const token = process.env.META_CAPI_ACCESS_TOKEN!;
  const version = process.env.META_API_VERSION || "v20.0";

  if (!pixelId || !token) {
    throw new Error(
      "Missing Meta credentials: NEXT_PUBLIC_META_PIXEL_ID or META_CAPI_ACCESS_TOKEN"
    );
  }

  // Hash emails
  const hashedEmails = params.emails.map((email) => sha256(email));

  // Delete users from audience
  const response = await fetch(
    `https://graph.facebook.com/${version}/${params.audienceId}/users`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payload: {
          schema: ["EMAIL"],
          data: hashedEmails.map((hash) => [hash]),
        },
        access_token: token,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to remove users from audience: ${error}`);
  }

  const result = await response.json();
  return result.num_deleted || hashedEmails.length;
}

/**
 * Get audience details from Meta
 */
export async function getAudienceDetails(
  audienceId: string
): Promise<AudienceResponse> {
  const token = process.env.META_CAPI_ACCESS_TOKEN!;
  const version = process.env.META_API_VERSION || "v20.0";

  if (!token) {
    throw new Error("Missing Meta credentials: META_CAPI_ACCESS_TOKEN");
  }

  const response = await fetch(
    `https://graph.facebook.com/${version}/${audienceId}?fields=id,name,approximate_count,subtype,description&access_token=${token}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get audience details: ${error}`);
  }

  return (await response.json()) as AudienceResponse;
}

/**
 * Delete a custom audience from Meta
 */
export async function deleteCustomAudience(audienceId: string): Promise<void> {
  const token = process.env.META_CAPI_ACCESS_TOKEN!;
  const version = process.env.META_API_VERSION || "v20.0";

  if (!token) {
    throw new Error("Missing Meta credentials: META_CAPI_ACCESS_TOKEN");
  }

  const response = await fetch(
    `https://graph.facebook.com/${version}/${audienceId}?access_token=${token}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete audience: ${error}`);
  }
}
