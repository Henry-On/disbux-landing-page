/**
 * Admin portal configuration.
 *
 * Single place to change portal-wide settings. The API base URL can be
 * overridden per page with <meta name="api-base-url" content="...">.
 */

export const DEFAULT_API_BASE = "https://disbux-production.up.railway.app/api";

export const DEVICE_NAME = "Disbux Admin Portal";

export function apiBaseUrl() {
  const fromMeta = document
    .querySelector('meta[name="api-base-url"]')
    ?.content?.replace(/\/+$/, "");
  return fromMeta || DEFAULT_API_BASE;
}

/** Next-page redirect targets must stay inside the admin portal. */
export function safeNextPath(value, fallback = "/admin/") {
  if (typeof value === "string" && value.startsWith("/admin/")) {
    try {
      const parsed = new URL(value, window.location.origin);
      if (parsed.origin === window.location.origin && parsed.pathname.startsWith("/admin/")) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      /* fall through to fallback */
    }
  }
  return fallback;
}
