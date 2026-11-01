/**
 * Admin portal configuration.
 *
 * Single place to change portal-wide settings. The API base URL can be
 * overridden per page with <meta name="api-base-url" content="...">.
 */

const useLocalhost = false

const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

export const DEFAULT_API_BASE = "https://disbux-dev.up.railway.app/api";

export const DEVICE_NAME = "Disbux Admin Portal";

export function apiBaseUrl() {

  return useLocalhost && isLocalhost ? "http://localhost:4000/api" : DEFAULT_API_BASE

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
