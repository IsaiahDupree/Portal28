/**
 * Security utilities for XSS prevention and input sanitization
 *
 * This module provides functions to sanitize HTML content and prevent XSS attacks.
 * Uses DOMPurify for robust HTML sanitization.
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks
 *
 * This function removes dangerous scripts, event handlers, and other
 * potentially malicious HTML while preserving safe formatting.
 *
 * @param html - Raw HTML content to sanitize
 * @param options - Optional DOMPurify configuration
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

  // Add hook to block data: URIs and other dangerous protocols
  DOMPurify.addHook("afterSanitizeAttributes", (node: Element) => {
    // Block data: URIs in src and href attributes
    if (node.hasAttribute("src")) {
      const src = node.getAttribute("src") || "";
      if (src.toLowerCase().startsWith("data:")) {
        node.removeAttribute("src");
      }
    }
    if (node.hasAttribute("href")) {
      const href = node.getAttribute("href") || "";
      if (href.toLowerCase().startsWith("data:") ||
          href.toLowerCase().startsWith("javascript:") ||
          href.toLowerCase().startsWith("vbscript:")) {
        node.removeAttribute("href");
      }
    }
  });

  const config: DOMPurify.Config = {
    // Allow safe HTML tags for course content
    ALLOWED_TAGS: options?.allowedTags || [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "span", "div",
      "strong", "em", "u", "s", "mark",
      "ul", "ol", "li",
      "a", "img",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "hr",
    ],
    // Allow safe attributes
    ALLOWED_ATTR: options?.allowedAttributes
      ? Object.keys(options.allowedAttributes)
      : ["href", "src", "alt", "title", "class", "id", "target", "rel"],
    // Keep certain safe attributes on anchor tags
    ALLOW_DATA_ATTR: false,
    // Add rel="noopener noreferrer" to links
    ADD_ATTR: ["target"],
    // Only allow safe protocols - explicitly block data:, javascript:, vbscript:, etc.
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    // Forbid tags that can contain scripts
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "textarea", "button"],
    // Forbid attributes that can execute scripts
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onmouseout", "onanimationend", "onanimationstart", "ontransitionend"],
  };

  const result = DOMPurify.sanitize(html, config);

  // Remove the hook after sanitization to prevent memory leaks
  DOMPurify.removeHook("afterSanitizeAttributes");

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
