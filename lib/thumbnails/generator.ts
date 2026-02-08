/**
 * Thumbnail Generator Library
 * Handles automated thumbnail creation with brand styling and text overlays
 *
 * Note: This is a simplified implementation that demonstrates the architecture.
 * In production, you would integrate with actual image processing libraries like:
 * - sharp (for server-side image manipulation)
 * - canvas (for drawing operations)
 * - ffmpeg (for video frame extraction)
 */

export interface ThumbnailTemplate {
  id?: string;
  name: string;
  layout_type: "default" | "centered" | "split" | "minimal" | "bold";
  brand_style: "professional" | "casual" | "playful" | "elegant" | "modern";
  background_color: string;
  text_color: string;
  accent_color: string;
  font_family: string;
  font_size_title: number;
  font_size_subtitle: number;
  text_position: "top" | "center" | "bottom" | "custom";
  overlay_opacity: number;
  logo_url?: string;
  logo_position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" | "none";
}

export interface ThumbnailSize {
  size_name: "youtube" | "instagram" | "twitter" | "facebook" | "linkedin" | "custom";
  width: number;
  height: number;
}

export interface ThumbnailGenerationOptions {
  videoUrl?: string;
  baseImageUrl?: string;
  template: ThumbnailTemplate;
  title: string;
  subtitle?: string;
  frameTimestamp?: number; // seconds
  sizes?: ThumbnailSize[];
}

export interface GeneratedThumbnail {
  size_name: string;
  width: number;
  height: number;
  file_url: string;
  file_size_bytes: number;
  format: "png" | "jpg" | "webp";
  quality: number;
}

// Standard thumbnail sizes for popular platforms
export const STANDARD_THUMBNAIL_SIZES: ThumbnailSize[] = [
  { size_name: "youtube", width: 1280, height: 720 },
  { size_name: "instagram", width: 1080, height: 1080 },
  { size_name: "twitter", width: 1200, height: 675 },
  { size_name: "facebook", width: 1200, height: 630 },
  { size_name: "linkedin", width: 1200, height: 627 },
];

// Default brand templates matching the database seeded values
export const DEFAULT_TEMPLATES: Record<string, Omit<ThumbnailTemplate, "id" | "name">> = {
  professional_purple: {
    layout_type: "centered",
    brand_style: "professional",
    background_color: "#554D91",
    text_color: "#FFFFFF",
    accent_color: "#948CD3",
    font_family: "sans-serif",
    font_size_title: 64,
    font_size_subtitle: 32,
    text_position: "center",
    overlay_opacity: 0.7,
    logo_position: "bottom-right",
  },
  bold_green: {
    layout_type: "bold",
    brand_style: "modern",
    background_color: "#547754",
    text_color: "#FFFFFF",
    accent_color: "#E2D2B1",
    font_family: "sans-serif",
    font_size_title: 72,
    font_size_subtitle: 36,
    text_position: "center",
    overlay_opacity: 0.8,
    logo_position: "bottom-right",
  },
  minimal_blue: {
    layout_type: "minimal",
    brand_style: "professional",
    background_color: "#5674BF",
    text_color: "#FFFFFF",
    accent_color: "#948CD3",
    font_family: "sans-serif",
    font_size_title: 56,
    font_size_subtitle: 28,
    text_position: "bottom",
    overlay_opacity: 0.5,
    logo_position: "top-right",
  },
  elegant_beige: {
    layout_type: "centered",
    brand_style: "elegant",
    background_color: "#E2D2B1",
    text_color: "#2C2849",
    accent_color: "#554D91",
    font_family: "serif",
    font_size_title: 60,
    font_size_subtitle: 30,
    text_position: "center",
    overlay_opacity: 0.6,
    logo_position: "bottom-right",
  },
};

/**
 * Extract frame from video at specified timestamp
 * In production, this would use FFmpeg or similar tool
 */
export async function extractVideoFrame(
  videoUrl: string,
  timestamp: number = 0
): Promise<{ imageBuffer: Buffer; width: number; height: number }> {
  // Placeholder implementation
  // In production, you would:
  // 1. Download video or use streaming
  // 2. Use ffmpeg to extract frame at timestamp
  // 3. Return image buffer and dimensions

  console.log(`Extracting frame from ${videoUrl} at ${timestamp}s`);

  // Simulated extraction
  return {
    imageBuffer: Buffer.from("simulated-frame-data"),
    width: 1920,
    height: 1080,
  };
}

/**
 * Generate thumbnail with text overlay and brand styling
 * In production, this would use sharp/canvas for actual image manipulation
 */
export async function generateThumbnail(
  baseImage: Buffer,
  options: {
    template: ThumbnailTemplate;
    title: string;
    subtitle?: string;
    width: number;
    height: number;
    format?: "png" | "jpg" | "webp";
    quality?: number;
  }
): Promise<{ buffer: Buffer; size: number }> {
  const {
    template,
    title,
    subtitle,
    width,
    height,
    format = "png",
    quality = 90,
  } = options;

  console.log(`Generating ${width}x${height} thumbnail with template:`, template.layout_type);
  console.log(`Title: ${title}`);
  if (subtitle) console.log(`Subtitle: ${subtitle}`);

  // Placeholder implementation
  // In production, you would:
  // 1. Load base image into canvas or sharp
  // 2. Resize to target dimensions
  // 3. Apply overlay with template background_color and overlay_opacity
  // 4. Render title text with font_size_title, text_color, font_family
  // 5. Render subtitle if provided
  // 6. Add logo if template.logo_url provided
  // 7. Apply brand styling based on layout_type
  // 8. Export to specified format and quality
  // 9. Return buffer and file size

  // Simulated generation
  const simulatedBuffer = Buffer.from(
    JSON.stringify({
      template: template.layout_type,
      title,
      subtitle,
      dimensions: `${width}x${height}`,
      format,
      quality,
      background: template.background_color,
      text: template.text_color,
    })
  );

  return {
    buffer: simulatedBuffer,
    size: simulatedBuffer.length,
  };
}

/**
 * Generate thumbnails in multiple sizes
 */
export async function generateMultipleSizes(
  baseImage: Buffer,
  options: {
    template: ThumbnailTemplate;
    title: string;
    subtitle?: string;
    sizes: ThumbnailSize[];
  }
): Promise<Map<string, { buffer: Buffer; size: number; width: number; height: number }>> {
  const results = new Map();

  for (const size of options.sizes) {
    const thumbnail = await generateThumbnail(baseImage, {
      template: options.template,
      title: options.title,
      subtitle: options.subtitle,
      width: size.width,
      height: size.height,
    });

    results.set(size.size_name, {
      buffer: thumbnail.buffer,
      size: thumbnail.size,
      width: size.width,
      height: size.height,
    });
  }

  return results;
}

/**
 * Upload thumbnail to storage
 * In production, this would upload to Supabase Storage or S3/R2
 */
export async function uploadThumbnail(
  buffer: Buffer,
  filename: string,
  contentType: string = "image/png"
): Promise<{ url: string; size: number }> {
  // Placeholder implementation
  // In production, you would:
  // 1. Upload to Supabase Storage or S3/R2
  // 2. Return public URL and file size

  console.log(`Uploading thumbnail: ${filename} (${buffer.length} bytes)`);

  // Simulated upload
  const simulatedUrl = `https://storage.example.com/thumbnails/${filename}`;

  return {
    url: simulatedUrl,
    size: buffer.length,
  };
}

/**
 * Complete thumbnail generation workflow
 */
export async function generateThumbnailWorkflow(
  options: ThumbnailGenerationOptions
): Promise<GeneratedThumbnail[]> {
  // Step 1: Get base image (from video frame or provided URL)
  let baseImage: Buffer;

  if (options.videoUrl && !options.baseImageUrl) {
    const frame = await extractVideoFrame(
      options.videoUrl,
      options.frameTimestamp || 0
    );
    baseImage = frame.imageBuffer;
  } else if (options.baseImageUrl) {
    // In production, download image from URL
    console.log(`Using base image from URL: ${options.baseImageUrl}`);
    baseImage = Buffer.from("simulated-base-image");
  } else {
    throw new Error("Either videoUrl or baseImageUrl must be provided");
  }

  // Step 2: Generate thumbnails in all requested sizes
  const sizes = options.sizes || STANDARD_THUMBNAIL_SIZES;

  const thumbnails = await generateMultipleSizes(baseImage, {
    template: options.template,
    title: options.title,
    subtitle: options.subtitle,
    sizes,
  });

  // Step 3: Upload all thumbnails
  const results: GeneratedThumbnail[] = [];

  for (const [sizeName, thumbnail] of thumbnails.entries()) {
    const filename = `thumbnail-${sizeName}-${Date.now()}.png`;

    const upload = await uploadThumbnail(thumbnail.buffer, filename);

    results.push({
      size_name: sizeName,
      width: thumbnail.width,
      height: thumbnail.height,
      file_url: upload.url,
      file_size_bytes: upload.size,
      format: "png",
      quality: 90,
    });
  }

  return results;
}

/**
 * Validate thumbnail template
 */
export function validateTemplate(template: Partial<ThumbnailTemplate>): boolean {
  if (!template.background_color || !template.text_color) {
    return false;
  }

  if (template.overlay_opacity !== undefined) {
    if (template.overlay_opacity < 0 || template.overlay_opacity > 1) {
      return false;
    }
  }

  if (template.font_size_title !== undefined) {
    if (template.font_size_title < 1 || template.font_size_title > 200) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate optimal text size for given dimensions
 */
export function calculateOptimalTextSize(
  text: string,
  containerWidth: number,
  containerHeight: number
): { fontSize: number; maxLines: number } {
  // Simple heuristic: 1 character ≈ 0.6 * fontSize pixels wide
  const charsPerLine = Math.floor(containerWidth / (0.6 * 64)); // Assuming 64px base font
  const lines = Math.ceil(text.length / charsPerLine);

  const maxFontSize = Math.min(
    Math.floor(containerWidth / (text.length * 0.6)),
    Math.floor(containerHeight / lines)
  );

  return {
    fontSize: Math.max(24, Math.min(maxFontSize, 120)), // Clamp between 24-120px
    maxLines: lines,
  };
}
