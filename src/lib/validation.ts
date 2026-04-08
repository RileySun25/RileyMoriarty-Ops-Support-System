/**
 * Security validation utilities
 * Fixes: VULN-01, 02, 03, 04, 05, 06, 08, 10, 12
 */

// =============================================
// Task ID Validation (VULN-01, 02, 08)
// =============================================

/**
 * Validates that a task ID is safe to use in file paths.
 * Allows: UUID v4 (from auto-generate) and manual-{timestamp}-{random} (from manual create)
 * Blocks: path traversal characters (..  /  \  .), encoded variants
 */
const TASK_ID_REGEX = /^[a-f0-9\-]+$|^manual-\d+-[a-z0-9]+$/i;

export function validateTaskId(id: string): boolean {
  return TASK_ID_REGEX.test(id) && !id.includes('.') && !id.includes('/') && !id.includes('\\') && id.length <= 100;
}

// =============================================
// CSS Value Sanitization (VULN-03, 10)
// =============================================

/**
 * Sanitizes a CSS color value. Only allows:
 * - Hex colors: #fff, #ffffff, #ffffffff
 * - rgb/rgba/hsl/hsla functions
 * Returns fallback if invalid.
 */
export function escCss(value: string, fallback: string): string {
  if (!value || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  // Allow hex colors
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  // Allow rgb/rgba/hsl/hsla with only safe chars (digits, commas, spaces, dots, %)
  if (/^(rgb|rgba|hsl|hsla)\([0-9,.\s%]+\)$/i.test(trimmed)) return trimmed;
  return fallback;
}

// =============================================
// Image Source Validation (VULN-04, 05)
// =============================================

/**
 * Validates and sanitizes an image source for use in HTML src attributes.
 * Allows: relative paths (images/xxx.png), data:image/ URIs, /api/download paths
 * Blocks: javascript:, onerror=, event handlers, external URLs
 */
export function sanitizeImageSrc(src: string): string {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();

  // Allow data:image/ base64 URIs
  if (trimmed.startsWith('data:image/')) return trimmed;

  // Allow relative paths (images/xxx.png) — must be safe filename chars only
  if (/^images\/[a-zA-Z0-9_\-./]+\.(png|jpg|jpeg|gif|webp|svg)$/i.test(trimmed)) return trimmed;

  // Allow /api/download/ paths
  if (/^\/api\/download\/[a-f0-9\-]+\?/.test(trimmed)) return trimmed;

  // Block everything else (external URLs, javascript:, event handlers)
  return '';
}

/**
 * Validates a watermark image value.
 * Only allows data:image/ base64 URIs (uploaded via the editor).
 */
export function sanitizeWatermarkImage(src: string): string {
  if (!src || typeof src !== 'string') return '';
  const trimmed = src.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;
  return '';
}

// =============================================
// URL Validation for SSRF Prevention (VULN-06, 12)
// =============================================

/**
 * Checks if a URL is safe to crawl.
 * - Only allows http: and https: protocols
 * - Blocks private/internal IP ranges
 * - Blocks localhost and metadata endpoints
 */
export function isUrlAllowed(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);

    // Only allow http/https
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    const host = url.hostname.toLowerCase();

    // Block localhost variants
    if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '0.0.0.0') return false;

    // Block private IP ranges
    if (host.startsWith('10.')) return false;
    if (host.startsWith('172.')) {
      const second = parseInt(host.split('.')[1]);
      if (second >= 16 && second <= 31) return false;
    }
    if (host.startsWith('192.168.')) return false;

    // Block link-local / metadata
    if (host.startsWith('169.254.')) return false;

    // Block common metadata endpoints
    if (host === 'metadata.google.internal') return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a URL is safe for BFS crawling — must be same origin and allowed.
 */
export function isUrlSafe(url: string, baseOrigin: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (parsed.origin !== baseOrigin) return false;
    return true;
  } catch {
    return false;
  }
}

// =============================================
// Path Traversal Prevention (VULN-01, 08)
// =============================================

import * as path from 'path';

/**
 * Resolves a user-provided path within a base directory, preventing path traversal.
 * Returns null if the resolved path escapes the base directory.
 */
export function safePath(baseDir: string, userPath: string): string | null {
  if (!userPath || typeof userPath !== 'string') return null;

  // Reject obviously malicious patterns
  if (userPath.includes('\0')) return null;

  const resolved = path.resolve(baseDir, userPath);

  // Ensure the resolved path is within baseDir
  if (!resolved.startsWith(baseDir + path.sep) && resolved !== baseDir) {
    return null;
  }

  return resolved;
}
