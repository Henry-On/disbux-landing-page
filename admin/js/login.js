/**
 * Admin sign-in page: admin email + password, then emailed 6-digit code.
 * Access is controlled by the backend ADMIN_EMAILS allow-list.
 */
import { Auth, hasRefreshToken, hasSession } from "./api.js";
import { safeNextPath } from "./config.js";
import { $, setNotice } from "./ui.js";

async function hasSessionSafe() {
  if (hasSession()) {
    try {
      const identity = await Auth.me();
      if (identity?.data?.email) return true;
    } catch {
      /* fall through to refresh attempt */
    }
  }
  if (!hasRefreshToken()) return false;
  try {
    await Auth.refresh();
    return true;
  } catch {
    return false;
  }
}

const state = { email: "", challengeId: "", resendTimer: null };
const params = new URLSearchParams(window.location.search);
const nextPath = safeNextPath(params.get("next"));

const authError = $("auth-error");
const authSuccess = $("auth-success");

function startResendCountdown(seconds = 60) {
  const button = $("resend-code");
  clearInterval(state.resendTimer);
  let remaining = seconds;
  button.disabled = true;
  button.textContent = `Resend code in ${remaining}s`;
  state.resendTimer = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(state.resendTimer);
      state.resendTimer = null;
      button.disabled = false;
      button.textContent = "Resend code";
    } else {
      button.textContent = `Resend code in ${remaining}s`;
    }
  }, 1000);
}

function showVerifyView(email) {
  $("login-view").hidden = true;
  $("verify-view").hidden = false;
  $("verify-email").textContent = email;
  $("verify-code").focus();
  startResendCountdown();
}

$("back-to-login").addEventListener("click", () => {
  clearInterval(state.resendTimer);
  state.challengeId = "";
  $("verify-code").value = "";
  setNotice(authError, "");
  setNotice(authSuccess, "");
  $("verify-view").hidden = true;
  $("login-view").hidden = false;
});

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  setNotice(authError, "");
  setNotice(authSuccess, "");
  const submit = $("login-submit");
  submit.disabled = true;
  submit.textContent = "Checking credentials…";
  try {
    const email = $("admin-email").value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Enter a valid email address.");
    }
    state.email = email;
    const result = await Auth.login(email, $("admin-password").value);
    $("admin-password").value = "";
    state.challengeId = result.data?.challengeId || "";
    if (!result.data?.requiresVerification || !state.challengeId) {
      throw new Error("The server returned an invalid verification request.");
    }
    showVerifyView(result.data.email || email);
    setNotice(authSuccess, result.message || "Check your email for the sign-in code.", "success");
  } catch (error) {
    setNotice(authError, error.message, "error");
  } finally {
    submit.disabled = false;
    submit.textContent = "Continue";
  }
});

$("verify-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  setNotice(authError, "");
  setNotice(authSuccess, "");
  const submit = $("verify-submit");
  submit.disabled = true;
  submit.textContent = "Verifying…";
  try {
    const result = await Auth.verify({
      email: state.email,
      challengeId: state.challengeId,
      code: $("verify-code").value.trim(),
    });
    const data = result.data || {};
    if (!data.accessToken || !data.refreshToken || !data.user?.email) {
      throw new Error("The server returned an invalid admin session.");
    }
    Auth.storeSession(data);
    clearInterval(state.resendTimer);
    window.location.replace(nextPath);
  } catch (error) {
    setNotice(authError, error.message, "error");
  } finally {
    submit.disabled = false;
    submit.textContent = "Verify and sign in";
  }
});

$("resend-code").addEventListener("click", async () => {
  const button = $("resend-code");
  button.disabled = true;
  try {
    const result = await Auth.resend({ email: state.email, challengeId: state.challengeId });
    setNotice(authError, "");
    setNotice(authSuccess, result.message || "A new verification code was sent.", "success");
    startResendCountdown();
  } catch (error) {
    setNotice(authError, error.message, "error");
    if (error.message.startsWith("Wait ")) {
      const seconds = Number(error.message.match(/\d+/)?.[0] || 60);
      startResendCountdown(seconds);
    } else {
      button.disabled = false;
    }
  }
});

// Already signed in? Skip the form.
if (await hasSessionSafe()) {
  window.location.replace(nextPath);
}
