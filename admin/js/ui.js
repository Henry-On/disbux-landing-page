/**
 * Shared admin-portal UI helpers (ES module).
 *
 * Small DOM utilities, notice handling, modal wiring and the auth guard that
 * protects every admin page except login.
 */
import { Auth, clearSession, hasRefreshToken, hasSession } from "./api.js";

export const $ = (id) => document.getElementById(id);

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

/** Show or clear a notice paragraph. kind: "" | "error" | "success". */
export function setNotice(element, message, kind = "") {
  if (!element) return;
  element.textContent = message || "";
  element.hidden = !message;
  element.classList.toggle("error", kind === "error");
  element.classList.toggle("success", kind === "success");
}

export function fmtDateTime(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

export function fmtNaira(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function openModal(id) {
  $(id).hidden = false;
}

export function closeModal(id) {
  $(id).hidden = true;
}

export function wireModals() {
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.closeModal));
  });
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) backdrop.hidden = true;
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      document.querySelectorAll(".modal-backdrop").forEach((modal) => {
        modal.hidden = true;
      });
    }
  });
}

/**
 * Ensure the visitor holds a valid admin session, otherwise send them to the
 * login page (with ?next= so they land back here after signing in).
 * Resolves to the signed-in admin email.
 */
export async function requireAdmin() {
  const goLogin = () => {
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    window.location.replace(`/admin/login.html?next=${next}`);
    return new Promise(() => {});
  };

  if (!hasSession() && hasRefreshToken()) {
    try {
      await Auth.refresh();
    } catch {
      clearSession();
      return goLogin();
    }
  }
  if (!hasSession()) {
    clearSession();
    return goLogin();
  }
  try {
    const identity = await Auth.me();
    const email = identity?.data?.email;
    if (!email) throw new Error("invalid identity");
    return email;
  } catch {
    clearSession();
    return goLogin();
  }
}

/** Fill the identity label and wire sign-out + mobile nav. Idempotent. */
export function wireShell(email) {
  const identity = $("admin-identity");
  if (identity) identity.textContent = email;

  const logout = $("logout-button");
  if (logout && !logout.dataset.wired) {
    logout.dataset.wired = "true";
    logout.addEventListener("click", async () => {
      logout.disabled = true;
      try {
        await Auth.logout();
      } catch (error) {
        console.error("Admin session revocation failed:", error.message);
      } finally {
        window.location.replace("/admin/login.html");
      }
    });
  }

  const toggle = $("nav-toggle");
  const nav = $("portal-nav");
  if (toggle && nav && !toggle.dataset.wired) {
    toggle.dataset.wired = "true";
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }
}

/** Temporarily disable a submit button while an async action runs. */
export async function withButton(button, busyText, action) {
  const previous = button.textContent;
  button.disabled = true;
  button.textContent = busyText;
  try {
    return await action();
  } finally {
    button.disabled = false;
    button.textContent = previous;
  }
}
