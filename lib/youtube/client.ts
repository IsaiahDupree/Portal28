/**
 * YouTube API Client
 * Handles YouTube Data API v3 operations
 */

import { google, youtube_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// YouTube API configuration
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.force-ssl",
];

/**
 * Get OAuth2 client for YouTube API
 */
export function getYouTubeOAuth2Client(): OAuth2Client {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("YouTube OAuth credentials not configured");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/**
 * Generate YouTube OAuth authorization URL
 */
export function generateAuthUrl(state?: string): string {
  const oauth2Client = getYouTubeOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: "offline", // Get refresh token
    scope: YOUTUBE_SCOPES,
    state: state || "",
    prompt: "consent", // Force consent screen to ensure refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  scope: string;
}> {
  const oauth2Client = getYouTubeOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Failed to get tokens from YouTube");
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date || 0,
    token_type: tokens.token_type || "Bearer",
    scope: tokens.scope || YOUTUBE_SCOPES.join(" "),
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expiry_date: number;
}> {
  const oauth2Client = getYouTubeOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh access token");
  }

  return {
    access_token: credentials.access_token,
    expiry_date: credentials.expiry_date || 0,
  };
}

/**
 * Get authenticated YouTube client
 */
export function getYouTubeClient(accessToken: string): youtube_v3.Youtube {
  const oauth2Client = getYouTubeOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.youtube({ version: "v3", auth: oauth2Client });
}

/**
 * Upload video to YouTube
 */
export async function uploadVideo(
  accessToken: string,
  options: {
    title: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus?: "private" | "public" | "unlisted";
    videoFilePath?: string;
    videoStream?: NodeJS.ReadableStream;
  }
): Promise<{
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
}> {
  const youtube = getYouTubeClient(accessToken);

  const videoResource = {
    snippet: {
      title: options.title,
      description: options.description || "",
      tags: options.tags || [],
      categoryId: options.categoryId || "22", // Default: People & Blogs
    },
    status: {
      privacyStatus: options.privacyStatus || "private",
    },
  };

  // Note: For actual file upload, you'd need to use resumable upload
  // This is a simplified version for documentation purposes
  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: videoResource,
    // media would include the file upload stream in production
  });

  if (!response.data.id) {
    throw new Error("Failed to upload video to YouTube");
  }

  return {
    videoId: response.data.id,
    title: response.data.snippet?.title || options.title,
    description: response.data.snippet?.description || "",
    publishedAt: response.data.snippet?.publishedAt || new Date().toISOString(),
  };
}

/**
 * Set video thumbnail
 */
export async function setVideoThumbnail(
  accessToken: string,
  videoId: string,
  thumbnailStream: NodeJS.ReadableStream
): Promise<void> {
  const youtube = getYouTubeClient(accessToken);

  await youtube.thumbnails.set({
    videoId,
    // media would include the thumbnail stream in production
  });
}

/**
 * Update video metadata
 */
export async function updateVideoMetadata(
  accessToken: string,
  videoId: string,
  updates: {
    title?: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
    privacyStatus?: "private" | "public" | "unlisted";
  }
): Promise<void> {
  const youtube = getYouTubeClient(accessToken);

  // First, get current video details
  const currentVideo = await youtube.videos.list({
    part: ["snippet", "status"],
    id: [videoId],
  });

  if (!currentVideo.data.items || currentVideo.data.items.length === 0) {
    throw new Error(`Video ${videoId} not found`);
  }

  const current = currentVideo.data.items[0];

  // Update with new values
  await youtube.videos.update({
    part: ["snippet", "status"],
    requestBody: {
      id: videoId,
      snippet: {
        ...current.snippet,
        title: updates.title || current.snippet?.title,
        description: updates.description || current.snippet?.description,
        tags: updates.tags || current.snippet?.tags,
        categoryId: updates.categoryId || current.snippet?.categoryId,
      },
      status: {
        ...current.status,
        privacyStatus: updates.privacyStatus || current.status?.privacyStatus,
      },
    },
  });
}

/**
 * Get video details
 */
export async function getVideoDetails(
  accessToken: string,
  videoId: string
): Promise<{
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  privacyStatus: string;
}> {
  const youtube = getYouTubeClient(accessToken);

  const response = await youtube.videos.list({
    part: ["snippet", "contentDetails", "statistics", "status"],
    id: [videoId],
  });

  if (!response.data.items || response.data.items.length === 0) {
    throw new Error(`Video ${videoId} not found`);
  }

  const video = response.data.items[0];

  return {
    id: video.id!,
    title: video.snippet?.title || "",
    description: video.snippet?.description || "",
    publishedAt: video.snippet?.publishedAt || "",
    thumbnailUrl: video.snippet?.thumbnails?.high?.url || "",
    duration: video.contentDetails?.duration || "",
    viewCount: parseInt(video.statistics?.viewCount || "0", 10),
    likeCount: parseInt(video.statistics?.likeCount || "0", 10),
    commentCount: parseInt(video.statistics?.commentCount || "0", 10),
    privacyStatus: video.status?.privacyStatus || "private",
  };
}

/**
 * Delete video from YouTube
 */
export async function deleteVideo(
  accessToken: string,
  videoId: string
): Promise<void> {
  const youtube = getYouTubeClient(accessToken);

  await youtube.videos.delete({
    id: videoId,
  });
}

/**
 * List user's uploaded videos
 */
export async function listUserVideos(
  accessToken: string,
  options?: {
    maxResults?: number;
    pageToken?: string;
  }
): Promise<{
  videos: Array<{
    id: string;
    title: string;
    publishedAt: string;
    thumbnailUrl: string;
  }>;
  nextPageToken?: string;
}> {
  const youtube = getYouTubeClient(accessToken);

  // Get user's channel
  const channelResponse = await youtube.channels.list({
    part: ["contentDetails"],
    mine: true,
  });

  if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
    throw new Error("User channel not found");
  }

  const uploadsPlaylistId =
    channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error("Uploads playlist not found");
  }

  // Get videos from uploads playlist
  const playlistResponse = await youtube.playlistItems.list({
    part: ["snippet"],
    playlistId: uploadsPlaylistId,
    maxResults: options?.maxResults || 50,
    pageToken: options?.pageToken,
  });

  const videos =
    playlistResponse.data.items?.map((item) => ({
      id: item.snippet?.resourceId?.videoId || "",
      title: item.snippet?.title || "",
      publishedAt: item.snippet?.publishedAt || "",
      thumbnailUrl: item.snippet?.thumbnails?.high?.url || "",
    })) || [];

  return {
    videos,
    nextPageToken: playlistResponse.data.nextPageToken || undefined,
  };
}
