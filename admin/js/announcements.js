/**
 * Announcements + carousel management page.
 *
 * Publish broadcasts to every user (carousel, feed, email, push). Editing,
 * hiding and deleting only change the carousel — already-sent emails and
 * notifications are not touched. List/edit/delete need backend endpoints
 * (see ADMIN_API_CONTRACT.md) and degrade gracefully until they exist.
 */
import { Announcements } from "./api.js";
import {
  $, esc, fmtDateTime, openModal, requireAdmin, setNotice, wireModals, wireShell, withButton,
} from "./ui.js";

const email = await requireAdmin();
wireShell(email);
wireModals();

const MAX_TITLE = 100;
const MAX_BODY = 2000;
const NOT_AVAILABLE =
  "That action isn't available on the server yet. Ask the backend team to implement the announcement management endpoints in ADMIN_API_CONTRACT.md.";

let editingId = "";

$("announcement-title").setAttribute("maxlength", String(MAX_TITLE));
$("announcement-body").setAttribute("maxlength", String(MAX_BODY));

$("announcement-body").addEventListener("input", () => {
  $("body-count").textContent = `${$("announcement-body").value.length} / ${MAX_BODY}`;
});

$("announcement-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const errorBox = $("announcement-error");
  const resultBox = $("announcement-result");
  setNotice(errorBox, "");
  setNotice(resultBox, "");

  const title = $("announcement-title").value.trim();
  const body = $("announcement-body").value.trim();
  if (title.length < 3 || body.length < 3) {
    setNotice(errorBox, "Enter a title and message of at least 3 characters.", "error");
    return;
  }
  if (!window.confirm("Publish this announcement to all users? It will appear in the app carousel and notification feed, and be sent by email and push where available.")) {
    return;
  }
  await withButton($("announcement-submit"), "Publishing…", async () => {
    try {
      const response = await Announcements.publish({ title, body });
      const result = response.data || {};
      setNotice(
        resultBox,
        `Published to ${result.recipients ?? 0} users. Email: ${result.emailsSent ?? 0} sent, ${result.emailsFailed ?? 0} failed. Push: ${result.pushesSent ?? 0} sent, ${result.pushesFailed ?? 0} failed.`,
        "success",
      );
      $("announcement-form").reset();
      $("body-count").textContent = `0 / ${MAX_BODY}`;
      await loadHistory();
    } catch (error) {
      setNotice(errorBox, error.message, "error");
    }
  });
});

function historyCard(item) {
  const active = item.active !== false;
  return `<article class="history-row ${active ? "" : "inactive"}">
    <div>
      <h3 class="history-title">${esc(item.title || "(untitled)")}</h3>
      <p class="history-body">${esc(item.body || "")}</p>
      <p class="history-meta">${active ? "Visible in carousel" : "Hidden from carousel"} · ${esc(fmtDateTime(item.createdAt))}</p>
      <div class="submission-actions">
        <button class="button outline" type="button" data-action="edit" data-id="${esc(item.id)}">Edit</button>
        <button class="button outline" type="button" data-action="toggle" data-id="${esc(item.id)}" data-active="${active ? "1" : "0"}">${active ? "Hide" : "Show"}</button>
        <button class="button danger" type="button" data-action="delete" data-id="${esc(item.id)}">Delete</button>
      </div>
    </div>
  </article>`;
}

async function loadHistory() {
  const wrap = $("announcement-history");
  wrap.innerHTML = `<div class="empty-state">Loading…</div>`;
  try {
    const response = await Announcements.list();
    const items = Array.isArray(response.data) ? response.data : [];
    if (!items.length) {
      wrap.innerHTML = `<div class="empty-state">No announcements yet. Published ones will appear here for editing.</div>`;
      return;
    }
    wrap.innerHTML = items.slice(0, 20).map(historyCard).join("");
  } catch (error) {
    if (error.status === 404 || error.status === 405) {
      wrap.innerHTML = `<div class="empty-state">Management isn't available: the backend doesn't expose an announcement list yet. Publishing above still works.</div>`;
    } else {
      wrap.innerHTML = `<div class="empty-state">Couldn't load announcements: ${esc(error.message)}</div>`;
    }
  }
}

function missingEndpoint(error) {
  return error.status === 404 || error.status === 405;
}

$("announcement-history").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === "edit") {
    const card = button.closest(".history-row");
    editingId = id;
    $("edit-title").value = card.querySelector(".history-title").textContent;
    $("edit-body").value = card.querySelector(".history-body").textContent;
    setNotice($("edit-error"), "");
    openModal("edit-modal");
    $("edit-title").focus();
    return;
  }

  if (action === "toggle") {
    const makeActive = button.dataset.active !== "1";
    await withButton(button, "Saving…", async () => {
      try {
        await Announcements.update(id, { active: makeActive });
        await loadHistory();
      } catch (error) {
        window.alert(missingEndpoint(error) ? NOT_AVAILABLE : error.message);
      }
    });
    return;
  }

  if (action === "delete") {
    if (!window.confirm("Delete this announcement? It disappears from the carousel. Already-sent emails and notifications are not recalled.")) return;
    await withButton(button, "Deleting…", async () => {
      try {
        await Announcements.remove(id);
        await loadHistory();
      } catch (error) {
        window.alert(missingEndpoint(error) ? NOT_AVAILABLE : error.message);
      }
    });
  }
});

$("edit-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = $("edit-title").value.trim();
  const body = $("edit-body").value.trim();
  if (title.length < 3 || body.length < 3) {
    setNotice($("edit-error"), "Enter a title and message of at least 3 characters.", "error");
    return;
  }
  await withButton($("edit-submit"), "Saving…", async () => {
    try {
      await Announcements.update(editingId, { title, body });
      $("edit-modal").hidden = true;
      await loadHistory();
    } catch (error) {
      setNotice($("edit-error"), missingEndpoint(error) ? NOT_AVAILABLE : error.message, "error");
    }
  });
});

$("refresh-history").addEventListener("click", loadHistory);
await loadHistory();
