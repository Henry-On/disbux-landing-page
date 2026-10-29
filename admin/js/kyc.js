/**
 * KYC reviews page: filterable submissions, private photo viewer,
 * approve / reject-with-reason workflow.
 */
import { Kyc } from "./api.js";
import {
  $, esc, fmtDateTime, openModal, requireAdmin, setNotice, wireModals, wireShell, withButton,
} from "./ui.js";

const email = await requireAdmin();
wireShell(email);
wireModals();

const list = $("submission-list");
const notice = $("kyc-notice");
let reviewId = "";

function fullName(user) {
  return [user.firstName, user.otherNames, user.lastName].filter(Boolean).join(" ") || user.username || "Unnamed user";
}

function renderSubmissions(submissions) {
  if (!submissions.length) {
    list.innerHTML = `<div class="empty-state">No submissions found for this status.</div>`;
    return;
  }
  list.innerHTML = submissions.map((submission) => {
    const user = submission.user || {};
    const statusClass = submission.status === "APPROVED" ? "approved" : submission.status === "REJECTED" ? "rejected" : "";
    const rejection = submission.rejectionReason
      ? `<div class="detail"><span class="detail-label">Rejection reason</span><span class="detail-value">${esc(submission.rejectionReason)}</span></div>`
      : "";
    const reviewActions = submission.status === "PENDING_REVIEW"
      ? `<button class="button outline" type="button" data-action="photos" data-id="${esc(submission.id)}">View private photos</button>
         <button class="button success" type="button" data-action="approve" data-id="${esc(submission.id)}">Approve</button>
         <button class="button danger" type="button" data-action="reject" data-id="${esc(submission.id)}">Reject</button>`
      : "";
    return `<article class="submission" data-submission="${esc(submission.id)}">
      <div class="submission-head">
        <div>
          <h3 class="submission-name">${esc(fullName(user))}</h3>
          <p class="submission-sub">${esc(user.email || "no email")} · ${esc(user.phoneNumber || "No phone number")} · Submitted ${esc(fmtDateTime(submission.createdAt))}</p>
        </div>
        <span class="badge ${statusClass}">${esc(submission.status.replaceAll("_", " "))}</span>
      </div>
      <div class="submission-details">
        <div><span class="detail-label">Username</span><span class="detail-value">${esc(user.username || "—")}</span></div>
        <div><span class="detail-label">Date of birth</span><span class="detail-value">${esc(user.DOB || "—")}</span></div>
        <div><span class="detail-label">Account type</span><span class="detail-value">${esc(user.accountType || "—")}</span></div>
        <div><span class="detail-label">NIN</span><span class="detail-value">${esc(user.NIN || "—")}</span></div>
        <div><span class="detail-label">BVN</span><span class="detail-value">${esc(user.BVN || "—")}</span></div>
        ${rejection}
      </div>
      <div class="submission-actions">${reviewActions}</div>
    </article>`;
  }).join("");
}

async function loadSubmissions() {
  list.innerHTML = `<div class="empty-state">Loading KYC submissions…</div>`;
  setNotice(notice, "");
  try {
    const response = await Kyc.list($("kyc-filter").value);
    renderSubmissions(Array.isArray(response.data) ? response.data : []);
  } catch (error) {
    list.innerHTML = "";
    setNotice(notice, error.message, "error");
  }
}

async function openPhotos(submissionId) {
  const grid = $("photo-grid");
  openModal("photo-modal");
  grid.innerHTML = `<div class="empty-state">Loading private photos…</div>`;
  setNotice($("photo-error"), "");
  try {
    const [selfie, idPhoto] = await Promise.all([
      Kyc.photo(submissionId, "selfie"),
      Kyc.photo(submissionId, "idPhoto"),
    ]);
    const images = [
      { label: "Selfie", url: selfie?.data?.url },
      { label: "Identity document", url: idPhoto?.data?.url },
    ];
    const invalid = images.some(({ url }) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol !== "https:" || parsed.hostname !== "api.cloudinary.com";
      } catch {
        return true;
      }
    });
    if (invalid) throw new Error("The server returned an invalid private image link.");
    grid.innerHTML = images.map(({ label, url }) =>
      `<div><p class="photo-label">${esc(label)}</p><div class="photo-frame"><img src="${esc(url)}" alt="${esc(label)}" referrerpolicy="no-referrer"></div></div>`).join("");
  } catch (error) {
    grid.innerHTML = "";
    setNotice($("photo-error"), error.message, "error");
  }
}

async function reviewSubmission(submissionId, decision, reason = "") {
  setNotice(notice, "");
  try {
    const result = await Kyc.review(submissionId, decision, reason);
    if (decision === "REJECTED") $("reject-modal").hidden = true;
    setNotice(notice, result.message || `KYC ${decision.toLowerCase()} successfully.`, "success");
    await loadSubmissions();
  } catch (error) {
    if (decision === "REJECTED") setNotice($("reject-error"), error.message, "error");
    else setNotice(notice, error.message, "error");
  }
}

$("kyc-filter").addEventListener("change", loadSubmissions);
$("refresh-kyc").addEventListener("click", loadSubmissions);

list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === "photos") return openPhotos(id);
  if (button.dataset.action === "approve") {
    if (window.confirm("Approve this KYC submission? The user will be verified and may receive a funding account.")) {
      await withButton(button, "Saving…", () => reviewSubmission(id, "APPROVED"));
    }
  }
  if (button.dataset.action === "reject") {
    reviewId = id;
    $("rejection-reason").value = "";
    setNotice($("reject-error"), "");
    openModal("reject-modal");
    $("rejection-reason").focus();
  }
});

$("reject-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const reason = $("rejection-reason").value.trim();
  if (reason.length < 5) {
    setNotice($("reject-error"), "Enter a rejection reason of at least 5 characters.", "error");
    return;
  }
  await withButton($("reject-submit"), "Saving…", () => reviewSubmission(reviewId, "REJECTED", reason));
});

await loadSubmissions();
