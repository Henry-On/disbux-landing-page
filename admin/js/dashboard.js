/**
 * Admin dashboard: pending-KYC workload, totals and shortcuts.
 * Optional backend endpoints (announcement list) degrade silently.
 */
import { Announcements, Kyc } from "./api.js";
import { $, esc, fmtDateTime, requireAdmin, setNotice, wireShell } from "./ui.js";

const email = await requireAdmin();
wireShell(email);

const notice = $("dash-notice");

function statCard(label, value, sub = "") {
  return `<div class="stat-card"><span class="stat-label">${esc(label)}</span><span class="stat-value">${esc(value)}</span>${sub ? `<span class="stat-sub">${esc(sub)}</span>` : ""}</div>`;
}

async function optionalList(fetcher) {
  try {
    const response = await fetcher();
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (error.status === 404 || error.status === 405) return null; // not implemented server-side
    throw error;
  }
}

async function load() {
  const stats = $("stat-grid");
  const recent = $("recent-pending");
  stats.innerHTML = `<div class="empty-state">Loading…</div>`;
  recent.innerHTML = "";
  setNotice(notice, "");
  try {
    const [submissions, announcements] = await Promise.all([
      Kyc.list("ALL").then((r) => (Array.isArray(r.data) ? r.data : [])),
      optionalList(() => Announcements.list()),
    ]);

    const pending = submissions.filter((s) => s.status === "PENDING_REVIEW");
    const approved = submissions.filter((s) => s.status === "APPROVED").length;
    const rejected = submissions.filter((s) => s.status === "REJECTED").length;

    stats.innerHTML =
      statCard("Pending KYC reviews", String(pending.length), pending.length ? "needs your review" : "all caught up") +
      statCard("KYC approved", String(approved)) +
      statCard("KYC rejected", String(rejected)) +
      statCard("Announcements", announcements === null ? "—" : String(announcements.length), announcements === null ? "history unavailable" : "in carousel");

    if (!pending.length) {
      recent.innerHTML = `<div class="empty-state">No pending KYC submissions. Everything is reviewed.</div>`;
      return;
    }
    recent.innerHTML = pending.slice(0, 5).map((s) => {
      const user = s.user || {};
      const name = [user.firstName, user.otherNames, user.lastName].filter(Boolean).join(" ") || user.username || "Unnamed user";
      return `<a class="recent-row" href="/admin/kyc.html">
        <span class="recent-name">${esc(name)}</span>
        <span class="recent-sub">${esc(user.email || "no email")} · submitted ${esc(fmtDateTime(s.createdAt))}</span>
      </a>`;
    }).join("");
  } catch (error) {
    stats.innerHTML = "";
    setNotice(notice, error.message, "error");
  }
}

$("refresh-dashboard").addEventListener("click", load);
await load();
