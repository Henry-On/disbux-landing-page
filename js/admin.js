(() => {
  "use strict";

  const API_BASE = (document.querySelector('meta[name="api-base-url"]')?.content || "").replace(/\/+$/, "");
  const ACCESS_KEY = "disbuxAdminAccess";
  const REFRESH_KEY = "disbuxAdminRefresh";
  const DEVICE_KEY = "disbuxAdminDevice";
  const DEVICE_NAME = "Disbux Admin Portal";
  const byId = (id) => document.getElementById(id);
  const authPanel = byId("auth-panel");
  const adminPanel = byId("admin-panel");
  const authError = byId("auth-error");
  const authSuccess = byId("auth-success");
  const loginView = byId("login-view");
  const verifyView = byId("verify-view");
  const state = { email: "", challengeId: "", identity: null, refreshPromise: null, resendTimer: null, reviewId: "" };

  const getDeviceId = () => {
    let value = localStorage.getItem(DEVICE_KEY);
    if (!value) {
      value = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, value);
    }
    return value;
  };

  const setNotice = (element, message) => {
    element.textContent = message || "";
    element.hidden = !message;
  };

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

  const responseBody = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const request = async (path, options = {}, allowRefresh = true) => {
    if (!API_BASE) throw new Error("Admin API URL is not configured");
    const headers = new Headers(options.headers || {});
    headers.set("X-Client-Platform", "web");
    headers.set("X-Device-Id", getDeviceId());
    headers.set("X-Device-Name", DEVICE_NAME);
    if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const accessToken = sessionStorage.getItem(ACCESS_KEY);
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
    if (response.status === 401 && allowRefresh && sessionStorage.getItem(REFRESH_KEY) && !path.startsWith("/admin/auth/")) {
      await refreshSession();
      return request(path, options, false);
    }
    const body = await responseBody(response);
    if (!response.ok) throw new Error(body.message || `Request failed (${response.status})`);
    return body;
  };

  const authPost = (path, data) => request(path, {
    method: "POST",
    body: JSON.stringify({ ...data, deviceId: getDeviceId() }),
  }, false);

  const refreshSession = async () => {
    if (!state.refreshPromise) {
      const refreshToken = sessionStorage.getItem(REFRESH_KEY);
      state.refreshPromise = (async () => {
        if (!refreshToken) throw new Error("Admin session expired. Sign in again.");
        const result = await authPost("/admin/auth/refresh", { refreshToken });
        const data = result.data || {};
        if (!data.accessToken || !data.refreshToken) throw new Error("The server returned an invalid admin session");
        sessionStorage.setItem(ACCESS_KEY, data.accessToken);
        sessionStorage.setItem(REFRESH_KEY, data.refreshToken);
      })().catch((error) => {
        clearSession();
        throw error;
      }).finally(() => {
        state.refreshPromise = null;
      });
    }
    return state.refreshPromise;
  };

  const clearSession = () => {
    sessionStorage.removeItem(ACCESS_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
  };

  const showAdmin = (email) => {
    state.identity = { email };
    authPanel.hidden = true;
    adminPanel.hidden = false;
    byId("admin-identity").textContent = email;
    setNotice(authError, "");
    loadSubmissions();
  };

  const showAuth = () => {
    adminPanel.hidden = true;
    authPanel.hidden = false;
    loginView.hidden = false;
    verifyView.hidden = true;
  };

  const startResendCountdown = (seconds = 60) => {
    const button = byId("resend-code");
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
  };

  const loadSubmissions = async () => {
    const list = byId("submission-list");
    const notice = byId("kyc-notice");
    list.innerHTML = '<div class="empty-state">Loading KYC submissions…</div>';
    setNotice(notice, "");
    try {
      const status = encodeURIComponent(byId("kyc-filter").value);
      const response = await request(`/admin/kyc?status=${status}`);
      renderSubmissions(response.data || []);
    } catch (error) {
      list.innerHTML = "";
      setNotice(notice, error.message);
    }
  };

  const renderSubmissions = (submissions) => {
    const list = byId("submission-list");
    if (!submissions.length) {
      list.innerHTML = '<div class="empty-state">No submissions found for this status.</div>';
      return;
    }
    list.innerHTML = submissions.map((submission) => {
      const user = submission.user || {};
      const name = [user.firstName, user.otherNames, user.lastName].filter(Boolean).join(" ") || user.username || "Unnamed user";
      const statusClass = submission.status === "APPROVED" ? "approved" : submission.status === "REJECTED" ? "rejected" : "";
      const rejection = submission.rejectionReason
        ? `<div class="detail"><span class="detail-label">Rejection reason</span><span class="detail-value">${escapeHtml(submission.rejectionReason)}</span></div>`
        : "";
      const reviewActions = submission.status === "PENDING_REVIEW"
        ? `<button class="button outline" type="button" data-action="photos" data-id="${escapeHtml(submission.id)}">View private photos</button><button class="button success" type="button" data-action="approve" data-id="${escapeHtml(submission.id)}">Approve</button><button class="button danger" type="button" data-action="reject" data-id="${escapeHtml(submission.id)}">Reject</button>`
        : "";
      return `<article class="submission" data-submission="${escapeHtml(submission.id)}">
        <div class="submission-head">
          <div><h3 class="submission-name">${escapeHtml(name)}</h3><p class="submission-sub">${escapeHtml(user.email)} · ${escapeHtml(user.phoneNumber || "No phone number")} · Submitted ${escapeHtml(new Date(submission.createdAt).toLocaleString())}</p></div>
          <span class="badge ${statusClass}">${escapeHtml(submission.status.replaceAll("_", " "))}</span>
        </div>
        <div class="submission-details">
          <div><span class="detail-label">Username</span><span class="detail-value">${escapeHtml(user.username || "—")}</span></div>
          <div><span class="detail-label">Date of birth</span><span class="detail-value">${escapeHtml(user.DOB || "—")}</span></div>
          <div><span class="detail-label">Account type</span><span class="detail-value">${escapeHtml(user.accountType || "—")}</span></div>
          <div><span class="detail-label">NIN</span><span class="detail-value">${escapeHtml(user.NIN || "—")}</span></div>
          <div><span class="detail-label">BVN</span><span class="detail-value">${escapeHtml(user.BVN || "—")}</span></div>
          ${rejection}
        </div>
        <div class="submission-actions">${reviewActions}</div>
      </article>`;
    }).join("");
  };

  const openPhotos = async (submissionId) => {
    const modal = byId("photo-modal");
    const grid = byId("photo-grid");
    modal.hidden = false;
    grid.innerHTML = '<div class="empty-state">Loading private photos…</div>';
    setNotice(byId("photo-error"), "");
    try {
      const [selfie, idPhoto] = await Promise.all([
        request(`/admin/kyc/${encodeURIComponent(submissionId)}/photos/selfie`),
        request(`/admin/kyc/${encodeURIComponent(submissionId)}/photos/idPhoto`),
      ]);
      const images = [
        { label: "Selfie", url: selfie?.data?.url },
        { label: "Identity document", url: idPhoto?.data?.url },
      ];
      if (images.some(({ url }) => {
        try { const parsed = new URL(url); return parsed.protocol !== "https:" || parsed.hostname !== "api.cloudinary.com"; }
        catch { return true; }
      })) throw new Error("The server returned an invalid private image link");
      grid.innerHTML = images.map(({ label, url }) =>
        `<div><p class="photo-label">${label}</p><div class="photo-frame"><img src="${escapeHtml(url)}" alt="${label}" referrerpolicy="no-referrer"></div></div>`
      ).join("");
    } catch (error) {
      grid.innerHTML = "";
      setNotice(byId("photo-error"), error.message);
    }
  };

  const reviewSubmission = async (submissionId, decision, reason = "") => {
    const button = decision === "APPROVED" ? document.querySelector(`[data-action="approve"][data-id="${CSS.escape(submissionId)}"]`) : byId("reject-submit");
    const previousText = button?.textContent;
    if (button) { button.disabled = true; button.textContent = "Saving…"; }
    setNotice(byId("kyc-notice"), "");
    try {
      const result = await request(`/admin/kyc/${encodeURIComponent(submissionId)}/review`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ decision, reason }),
      });
      if (decision === "REJECTED") byId("reject-modal").hidden = true;
      setNotice(byId("kyc-notice"), result.message || `KYC ${decision.toLowerCase()} successfully.`);
      await loadSubmissions();
    } catch (error) {
      if (decision === "REJECTED") setNotice(byId("reject-error"), error.message);
      else setNotice(byId("kyc-notice"), error.message);
      if (button) { button.disabled = false; button.textContent = previousText; }
    }
  };

  byId("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    setNotice(authError, "");
    setNotice(authSuccess, "");
    const submit = byId("login-submit");
    submit.disabled = true;
    submit.textContent = "Checking credentials…";
    const form = new FormData(event.currentTarget);
    state.email = String(form.get("email") || "").trim().toLowerCase();
    try {
      const result = await authPost("/admin/auth/login", {
        email: state.email,
        password: String(form.get("password") || ""),
      });
      byId("admin-password").value = "";
      state.challengeId = result.data?.challengeId || "";
      if (!result.data?.requiresVerification || !state.challengeId) throw new Error("The server returned an invalid verification request");
      byId("verify-email").textContent = result.data.email || state.email;
      loginView.hidden = true;
      verifyView.hidden = false;
      byId("verify-code").focus();
      setNotice(authSuccess, result.message || "Check your email for the sign-in code.");
      startResendCountdown();
    } catch (error) {
      setNotice(authError, error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = "Continue";
    }
  });

  byId("verify-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    setNotice(authError, "");
    setNotice(authSuccess, "");
    const submit = byId("verify-submit");
    submit.disabled = true;
    submit.textContent = "Verifying…";
    try {
      const result = await authPost("/admin/auth/verify", {
        email: state.email,
        challengeId: state.challengeId,
        code: byId("verify-code").value.trim(),
      });
      const data = result.data || {};
      if (!data.accessToken || !data.refreshToken || !data.user?.email) throw new Error("The server returned an invalid admin session");
      sessionStorage.setItem(ACCESS_KEY, data.accessToken);
      sessionStorage.setItem(REFRESH_KEY, data.refreshToken);
      clearInterval(state.resendTimer);
      byId("verify-code").value = "";
      showAdmin(data.user.email);
    } catch (error) {
      setNotice(authError, error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = "Verify and sign in";
    }
  });

  byId("resend-code").addEventListener("click", async () => {
    const button = byId("resend-code");
    button.disabled = true;
    try {
      const result = await authPost("/admin/auth/resend", { email: state.email, challengeId: state.challengeId });
      setNotice(authError, "");
      setNotice(authSuccess, result.message || "A new verification code was sent.");
      startResendCountdown();
    } catch (error) {
      setNotice(authError, error.message);
      if (error.message.startsWith("Wait ")) {
        const seconds = Number(error.message.match(/\d+/)?.[0] || 60);
        startResendCountdown(seconds);
      } else {
        button.disabled = false;
      }
    }
  });

  byId("back-to-login").addEventListener("click", () => {
    clearInterval(state.resendTimer);
    state.challengeId = "";
    byId("verify-code").value = "";
    setNotice(authError, "");
    setNotice(authSuccess, "");
    showAuth();
  });

  byId("logout-button").addEventListener("click", async () => {
    const refreshToken = sessionStorage.getItem(REFRESH_KEY);
    try {
      if (refreshToken) await authPost("/admin/auth/logout", { refreshToken });
    } catch (error) {
      console.error("Admin session revocation failed:", error.message);
    } finally {
      clearSession();
      showAuth();
    }
  });

  byId("kyc-filter").addEventListener("change", loadSubmissions);
  byId("refresh-kyc").addEventListener("click", loadSubmissions);

  document.querySelector(".tabs").addEventListener("click", (event) => {
    const tab = event.target.closest("[data-tab]");
    if (!tab) return;
    document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
    const isKyc = tab.dataset.tab === "kyc";
    byId("kyc-section").hidden = !isKyc;
    byId("announcements-section").hidden = isKyc;
  });

  byId("submission-list").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const id = button.dataset.id;
    if (button.dataset.action === "photos") return openPhotos(id);
    if (button.dataset.action === "approve") {
      if (window.confirm("Approve this KYC submission? The user will be verified and may receive a funding account.")) {
        await reviewSubmission(id, "APPROVED");
      }
    }
    if (button.dataset.action === "reject") {
      state.reviewId = id;
      byId("rejection-reason").value = "";
      setNotice(byId("reject-error"), "");
      byId("reject-modal").hidden = false;
      byId("rejection-reason").focus();
    }
  });

  byId("reject-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const reason = byId("rejection-reason").value.trim();
    if (reason.length < 5) return setNotice(byId("reject-error"), "Enter a rejection reason of at least 5 characters.");
    await reviewSubmission(state.reviewId, "REJECTED", reason);
  });

  byId("announcement-body").addEventListener("input", () => {
    byId("body-count").textContent = `${byId("announcement-body").value.length} / 2000`;
  });

  byId("announcement-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    setNotice(byId("announcement-error"), "");
    setNotice(byId("announcement-result"), "");
    const title = byId("announcement-title").value.trim();
    const body = byId("announcement-body").value.trim();
    if (title.length < 3 || body.length < 3) return setNotice(byId("announcement-error"), "Enter a title and message of at least 3 characters.");
    if (!window.confirm("Publish this announcement to all users? It will appear in the app carousel, notification feed, and be sent by email and push where available.")) return;

    const submit = byId("announcement-submit");
    submit.disabled = true;
    submit.textContent = "Publishing…";
    try {
      const response = await request("/admin/announcements", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ title, body }),
      });
      const result = response.data || {};
      setNotice(
        byId("announcement-result"),
        `Published to ${result.recipients ?? 0} users. Email: ${result.emailsSent ?? 0} sent, ${result.emailsFailed ?? 0} failed. Push: ${result.pushesSent ?? 0} sent, ${result.pushesFailed ?? 0} failed. The announcement is now available to the app carousel.`,
      );
      byId("announcement-form").reset();
      byId("body-count").textContent = "0 / 2000";
    } catch (error) {
      setNotice(byId("announcement-error"), error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = "Review announcement";
    }
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => { byId(button.dataset.closeModal).hidden = true; });
  });
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) backdrop.hidden = true;
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") document.querySelectorAll(".modal-backdrop").forEach((modal) => { modal.hidden = true; });
  });

  const initialize = async () => {
    if (!sessionStorage.getItem(ACCESS_KEY) && sessionStorage.getItem(REFRESH_KEY)) {
      try {
        await refreshSession();
      } catch (error) {
        showAuth();
        setNotice(authError, error.message);
        return;
      }
    }
    if (!sessionStorage.getItem(ACCESS_KEY)) return showAuth();
    try {
      const identity = await request("/admin/me");
      const email = identity?.data?.email;
      if (!email) throw new Error("The server returned an invalid admin identity");
      showAdmin(email);
    } catch (error) {
      clearSession();
      showAuth();
      setNotice(authError, error.message || "Your admin session could not be verified. Please sign in again.");
    }
  };

  initialize();
})();
