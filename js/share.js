/**
 * Disbux voucher share helpers.
 *
 * Pure functions with no DOM dependencies, so the mobile app team and the
 * landing page (plus Node-based tests) share this exact contract.
 *
 * Canonical claim link (universal link: opens the app's redeem screen when
 * installed via the /user/redeem App Link, otherwise falls back to the
 * landing page claim UI served at the same URL):
 *
 *   https://disbux.com/user/redeem?claimCode={CODE}
 *
 * Canonical share template:
 *
 *   You've received a voucher!
 *   Voucher code: {CODE}
 *   Redeem securely at: {CLAIM_URL}
 *   Or open the Disbux app and enter the code manually.
 *   Safety reminder: Disbux will never ask for your PIN, password or OTP
 *   to claim a voucher.
 */

export const SITE_URL = "https://disbux.com";
export const CLAIM_PATH = "/user/redeem";
export const CLAIM_PARAM = "claimCode";
export const APP_SCHEME = "disbux";
export const ANDROID_PACKAGE = "com.disbux.app";

/** Where users without the app are sent, per platform. */
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
// TODO: replace with the real App Store URL once the iOS app is published,
// e.g. "https://apps.apple.com/app/disbux/id1234567890". Empty = iOS app not listed yet.
export const APP_STORE_URL = "";

/** Trim user input; vouchers are case-insensitive so callers display upper-case. */
export function normalizeVoucherCode(input) {
  return String(input ?? "").trim();
}

/** Voucher codes are short uppercase alphanumeric strings, e.g. K7P4Q2. */
export function isValidVoucherCode(input) {
  const code = normalizeVoucherCode(input);
  return code.length >= 3 && code.length <= 32 && /^[A-Za-z0-9-]+$/.test(code);
}

/**
 * Canonical web claim link. Served by claim.html on the landing page, which
 * offers code copying and redirects into the app when installed.
 */
export function buildClaimUrl(code, baseUrl = SITE_URL) {
  const clean = normalizeVoucherCode(code);
  if (!isValidVoucherCode(clean)) throw new Error("Enter a valid voucher code.");
  return `${String(baseUrl).replace(/\/+$/, "")}${CLAIM_PATH}?${CLAIM_PARAM}=${encodeURIComponent(clean.toUpperCase())}`;
}

const CLAIM_ROUTE = CLAIM_PATH.replace(/^\/+/, "");

/** Custom-scheme deep link into the app's redeem screen (expo-router route). */
export function buildAppClaimUrl(code) {
  const clean = normalizeVoucherCode(code);
  if (!isValidVoucherCode(clean)) throw new Error("Enter a valid voucher code.");
  return `${APP_SCHEME}://${CLAIM_ROUTE}?${CLAIM_PARAM}=${encodeURIComponent(clean.toUpperCase())}`;
}

/**
 * Android intent URL (more reliable than raw custom schemes on Chrome).
 * When the app is not installed, Chrome sends the user to `fallbackUrl`
 * (the Play Store listing) automatically via S.browser_fallback_url.
 */
export function buildAndroidIntentClaimUrl(code, fallbackUrl = PLAY_STORE_URL) {
  const clean = normalizeVoucherCode(code);
  if (!isValidVoucherCode(clean)) throw new Error("Enter a valid voucher code.");
  const encoded = encodeURIComponent(clean.toUpperCase());
  const fallback = fallbackUrl ? `;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}` : "";
  return `intent://${CLAIM_ROUTE}?${CLAIM_PARAM}=${encoded}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE}${fallback};end`;
}

/** Exact share message the app should generate for a voucher code. */
export function buildVoucherShareText(code, options = {}) {
  const clean = normalizeVoucherCode(code);
  if (!isValidVoucherCode(clean)) throw new Error("Enter a valid voucher code.");
  const display = clean.toUpperCase();
  const claimUrl = buildClaimUrl(display, options.baseUrl ?? SITE_URL);
  return [
    "You've received a voucher!",
    `Voucher code: ${display}`,
    `Redeem securely at: ${claimUrl}`,
    "Or open the Disbux app and enter the code manually.",
    "Safety reminder: Disbux will never ask for your PIN, password or OTP to claim a voucher.",
  ].join("\n");
}

/**
 * Extract a voucher code from a claim URL. Accepts ?claimCode= (canonical),
 * legacy ?code= / ?voucher=, and #claimCode= / #code= so links keep working
 * even if a client rewrites the query string.
 */
export function parseClaimCodeFromUrl(url) {
  try {
    const parsed = new URL(String(url), SITE_URL);
    const fromQuery =
      parsed.searchParams.get(CLAIM_PARAM) ||
      parsed.searchParams.get("code") ||
      parsed.searchParams.get("voucher") ||
      "";
    if (normalizeVoucherCode(fromQuery)) return normalizeVoucherCode(fromQuery).toUpperCase();
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    const fromHash = hashParams.get(CLAIM_PARAM) || hashParams.get("code") || "";
    return normalizeVoucherCode(fromHash).toUpperCase();
  } catch {
    return "";
  }
}

/** Store URL for a platform: "android" | "ios". Empty string = not listed yet. */
export function storeUrlForPlatform(platform) {
  if (platform === "android") return PLAY_STORE_URL;
  if (platform === "ios") return APP_STORE_URL;
  return "";
}
