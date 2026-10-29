/**
 * Admin API client (ES module).
 *
 * Owns the admin session (sessionStorage), transparent access-token refresh,
 * and every backend call the portal makes. Optional endpoints (list views the
 * backend may not implement yet) surface ApiError with .status so pages can
 * degrade gracefully instead of showing a scary failure.
 */
import { DEVICE_NAME, apiBaseUrl } from "./config.js";

const ACCESS_KEY = "disbuxAdminAccess";
const REFRESH_KEY = "disbuxAdminRefresh";
const DEVICE_KEY = "disbuxAdminDevice";

let refreshPromise = null;

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getDeviceId() {
  let value = localStorage.getItem(DEVICE_KEY);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, value);
  }
  return value;
}

export function hasSession() {
  return Boolean(sessionStorage.getItem(ACCESS_KEY));
}

export function hasRefreshToken() {
  return Boolean(sessionStorage.getItem(REFRESH_KEY));
}

export function clearSession() {
  sessionStorage.removeItem(ACCESS_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

async function readBody(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function apiRequest(path, { method = "GET", body, headers = {}, allowRefresh = true } = {}) {
  const base = apiBaseUrl();
  if (!base) throw new ApiError("Admin API URL is not configured.", 0);

  const requestHeaders = new Headers(headers);
  requestHeaders.set("X-Client-Platform", "web");
  requestHeaders.set("X-Device-Id", getDeviceId());
  requestHeaders.set("X-Device-Name", DEVICE_NAME);
  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set("Content-Type", "application/json");
  }
  const accessToken = sessionStorage.getItem(ACCESS_KEY);
  if (accessToken) requestHeaders.set("Authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${base}${path}`, {
    method,
    body,
    headers: requestHeaders,
    credentials: "include",
  });

  if (
    response.status === 401 &&
    allowRefresh &&
    hasRefreshToken() &&
    !path.startsWith("/admin/auth/")
  ) {
    await Auth.refresh();
    return apiRequest(path, { method, body, headers, allowRefresh: false });
  }

  const payload = await readBody(response);
  if (!response.ok) {
    throw new ApiError(payload.message || `Request failed (${response.status}).`, response.status);
  }
  return payload;
}

function authPost(path, data) {
  return apiRequest(
    path,
    { method: "POST", body: JSON.stringify({ ...data, deviceId: getDeviceId() }), allowRefresh: false },
  );
}

export function newIdempotencyKey() {
  return crypto.randomUUID();
}

export const Auth = {
  login(email, password) {
    return authPost("/admin/auth/login", { email, password });
  },
  verify({ email, challengeId, code }) {
    return authPost("/admin/auth/verify", { email, challengeId, code });
  },
  resend({ email, challengeId }) {
    return authPost("/admin/auth/resend", { email, challengeId });
  },
  async logout() {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    try {
      if (refreshToken) await authPost("/admin/auth/logout", { refreshToken });
    } finally {
      clearSession();
    }
  },
  me() {
    return apiRequest("/admin/me");
  },
  async refresh() {
    if (!refreshPromise) {
      const refreshToken = sessionStorage.getItem(REFRESH_KEY);
      refreshPromise = (async () => {
        if (!refreshToken) throw new ApiError("Admin session expired. Sign in again.", 401);
        const result = await authPost("/admin/auth/refresh", { refreshToken });
        const data = result.data || {};
        if (!data.accessToken || !data.refreshToken) {
          throw new ApiError("The server returned an invalid admin session.", 500);
        }
        sessionStorage.setItem(ACCESS_KEY, data.accessToken);
        sessionStorage.setItem(REFRESH_KEY, data.refreshToken);
      })()
        .catch((error) => {
          clearSession();
          throw error;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
    return refreshPromise;
  },
  storeSession({ accessToken, refreshToken }) {
    if (!accessToken || !refreshToken) {
      throw new ApiError("The server returned an invalid admin session.", 500);
    }
    sessionStorage.setItem(ACCESS_KEY, accessToken);
    sessionStorage.setItem(REFRESH_KEY, refreshToken);
  },
};

export const Kyc = {
  list(status = "PENDING_REVIEW") {
    return apiRequest(`/admin/kyc?status=${encodeURIComponent(status)}`);
  },
  photo(submissionId, kind) {
    return apiRequest(`/admin/kyc/${encodeURIComponent(submissionId)}/photos/${kind}`);
  },
  review(submissionId, decision, reason = "") {
    return apiRequest(`/admin/kyc/${encodeURIComponent(submissionId)}/review`, {
      method: "POST",
      headers: { "Idempotency-Key": newIdempotencyKey() },
      body: JSON.stringify({ decision, reason }),
    });
  },
};

export const Announcements = {
  /** Publish + broadcast to all users (carousel, feed, email, push). */
  publish({ title, body }) {
    return apiRequest("/admin/announcements", {
      method: "POST",
      headers: { "Idempotency-Key": newIdempotencyKey() },
      body: JSON.stringify({ title, body }),
    });
  },
  /** Optional: only works if the backend exposes a list endpoint. */
  list() {
    return apiRequest("/admin/announcements");
  },
  /** Optional: edit the carousel text or toggle visibility. No re-broadcast. */
  update(id, patch) {
    return apiRequest(`/admin/announcements/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Idempotency-Key": newIdempotencyKey() },
      body: JSON.stringify(patch),
    });
  },
  /** Optional: permanently remove a carousel announcement. */
  remove(id) {
    return apiRequest(`/admin/announcements/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Idempotency-Key": newIdempotencyKey() },
    });
  },
};
