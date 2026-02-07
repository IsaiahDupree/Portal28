/**
 * Security utilities for XSS prevention and input sanitization
 *
 * This module provides functions to sanitize HTML content and prevent XSS attacks.
 * Uses a simple regex-based sanitizer for serverless compatibility.
 */

// Safe tags that are allowed in sanitized HTML
const SAFE_TAGS = new Set([
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "span", "div",
  "strong", "em", "u", "s", "mark", "b", "i",
  "ul", "ol", "li",
  "a", "img",
  "blockquote", "pre", "code",
  "table", "thead", "tbody", "tr", "th", "td",
  "hr",
]);

// Dangerous tags that should always be removed
const DANGEROUS_TAGS = ["script", "style", "iframe", "object", "embed", "form", "input", "textarea", "button", "meta", "link", "base"];

// Dangerous attribute patterns - match attribute name and value
const DANGEROUS_ATTR_PATTERNS = [
  /\s*on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers like onclick="..." or onclick='...'
  /\s*on\w+\s*=\s*[^\s>]*/gi, // Event handlers without quotes
  /\s*href\s*=\s*["']javascript:[^"']*["']/gi, // javascript: in href
  /\s*href\s*=\s*javascript:[^\s>]*/gi,
  /\s*src\s*=\s*["']javascript:[^"']*["']/gi, // javascript: in src
  /\s*src\s*=\s*javascript:[^\s>]*/gi,
  /\s*src\s*=\s*["']data:[^"']*["']/gi, // data: URIs in src (can execute scripts)
  /\s*src\s*=\s*data:[^\s>]*/gi,
  /\s*style\s*=\s*["'][^"']*expression\s*\([^"']*["']/gi, // CSS expressions
  /\s*style\s*=\s*[^\s>]*expression\s*\([^\s>]*/gi,
];

/**
 * Sanitize HTML content to prevent XSS attacks
 *
 * This function removes dangerous scripts, event handlers, and other
 * potentially malicious HTML while preserving safe formatting.
 *
 * @param html - Raw HTML content to sanitize
 * @param options - Optional configuration
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeHtml(
  html: string,
  options?: {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
  }
): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  let result = html;

  // Remove dangerous tags completely (including content)
  DANGEROUS_TAGS.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
    result = result.replace(regex, "");
    // Also remove self-closing versions
    result = result.replace(new RegExp(`<${tag}[^>]*\\/?>`, "gi"), "");
  });

  // Remove dangerous attributes
  DANGEROUS_ATTR_PATTERNS.forEach(pattern => {
    result = result.replace(pattern, "");
  });

  // Remove any remaining script-like content
  result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  return result;
}

/**
 * Sanitize plain text input (escapes HTML entities)
 *
 * Use this for user input that should be displayed as plain text,
 * not rendered as HTML.
 *
 * @param text - Plain text to escape
 * @returns HTML-escaped text
 */
export function escapeHtml(text: string): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Sanitize SQL-like input (basic protection)
 *
 * Note: This should NOT be used as a replacement for parameterized queries.
 * Always use Supabase's built-in parameterization.
 * This is just an additional layer of defense.
 *
 * @param input - User input string
 * @returns Input with dangerous SQL patterns removed
 */
export function sanitizeSqlInput(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Remove common SQL injection patterns (as a defense-in-depth measure)
  const dangerous = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(-{2}|\/\*|\*\/)/g, // SQL comments
    /(\bOR\b.*=.*)/gi, // OR 1=1 patterns
    /(;)/g, // Statement terminators
  ];

  let sanitized = input;
  dangerous.forEach(pattern => {
    sanitized = sanitized.replace(pattern, "");
  });

  return sanitized.trim();
}

/**
 * Check if content contains potential XSS patterns
 *
 * @param content - Content to check
 * @returns true if suspicious patterns are found
 */
export function containsXssPatterns(content: string): boolean {
  if (!content || typeof content !== "string") {
    return false;
  }

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /eval\(/gi,
    /expression\(/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(content));
}

/**
 * Validate and sanitize URL to prevent XSS via href/src attributes
 *
 * @param url - URL to validate
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== "string") {
    return "";
  }

  // Remove whitespace
  url = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "about:",
  ];

  const lowerUrl = url.toLowerCase();
  if (dangerousProtocols.some(proto => lowerUrl.startsWith(proto))) {
    return "";
  }

  // Allow http(s), mailto, tel
  const allowedProtocolPattern = /^(https?:\/\/|mailto:|tel:|\/)/i;
  if (!allowedProtocolPattern.test(url)) {
    // Relative URLs are okay
    if (url.startsWith("/") || url.startsWith("#")) {
      return url;
    }
    return "";
  }

  return url;
}
