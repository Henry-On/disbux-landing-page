# Disbux Admin Portal — Backend Contract

The admin portal (`/admin/` on disbux.com) is a static multi-page app that talks
directly to the backend API. This document lists everything the backend must
provide for the portal to work, including the new announcement-management
endpoints.

Base URL: `https://disbux-production.up.railway.app/api` (overridable per page
via `<meta name="api-base-url">`). All calls send `X-Client-Platform: web`,
`X-Device-Id` (UUID v4), `X-Device-Name: Disbux Admin Portal`, and
`Authorization: Bearer <accessToken>` when signed in. CORS must allow
`https://disbux.com` with credentials.

## 1. Admin identity

The portal accepts any email; access is controlled entirely by the
backend allow-list. The current admin emails are:

```
princedagogoekine@gmail.com
orionu360@gmail.com
```

1. Add both to the Railway env, comma-separated (no spaces needed):
   `ADMIN_EMAILS=princedagogoekine@gmail.com,orionu360@gmail.com`
2. Make sure a `User` row with that email exists with a bcrypt `passwordHash`
   (register it in the app, or seed it), because admin sign-in verifies the
   account password first and then emails a 6-digit code.

No client-side email restriction is enforced, so any whitelisted address can
sign in from the portal.

## 2. Existing endpoints (already implemented, do not break)

| Method | Path | Used by |
|--------|------|---------|
| POST | `/admin/auth/login` | login page (`{ email, password, deviceId }`) |
| POST | `/admin/auth/verify` | login page (`{ email, challengeId, code, deviceId }`) |
| POST | `/admin/auth/resend` | login page (`{ email, challengeId, deviceId }`) |
| POST | `/admin/auth/refresh` | silent refresh (`{ refreshToken, deviceId }`) |
| POST | `/admin/auth/logout` | sign out (`{ refreshToken, deviceId }`) |
| GET | `/admin/me` | every page (`{ email }`) |
| GET | `/admin/kyc?status=PENDING_REVIEW\|APPROVED\|REJECTED\|ALL` | KYC page + dashboard |
| GET | `/admin/kyc/:id/photos/selfie` and `.../idPhoto` | KYC photo viewer (`{ url }`, https Cloudinary) |
| POST | `/admin/kyc/:id/review` | approve/reject (`{ decision, reason }`, `Idempotency-Key` header) |
| POST | `/admin/announcements` | announcements page (`{ title, body }`, `Idempotency-Key` header) |

Response envelope everywhere: `{ success, message?, data? }`.

## 3. New: announcement management endpoints (to implement)

The announcements page lists, edits, hides and deletes the carousel slides
(giveaway promos are posted as announcements — no money moves). Until these
exist, the portal shows a friendly "not available on the server yet" message,
while publishing (`POST /admin/announcements`) keeps working.

All three sit behind the existing `verifyAdmin` middleware. None of them
re-broadcast: they only change what `GET /api/announcements` (the app's
carousel feed) returns. Already-sent emails, push notifications and
notification-feed rows are left untouched.

### GET /admin/announcements

Returns all announcements including hidden ones, newest first (cap ~50):

```json
{
  "success": true,
  "data": [
    {
      "id": "…",
      "title": "Weekend giveaway",
      "body": "Use code K7P4Q2 before Sunday!",
      "active": true,
      "createdAt": "2026-10-01T10:00:00.000Z"
    }
  ]
}
```

Suggested implementation: `prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50 })`.

### PATCH /admin/announcements/:id

Edits the carousel text and/or visibility. Partial body — any of:

```json
{ "title": "New title", "body": "New message", "active": false }
```

Validation: mirror the create rules when a field is present (title 3–100,
body 3–2000, `active` boolean). Require the `Idempotency-Key` header.
Respond `404` for unknown ids, `200` with the updated row:

```json
{ "success": true, "data": { "id": "…", "title": "…", "body": "…", "active": false } }
```

Setting `active: false` hides the slide from the carousel without deleting it.

### DELETE /admin/announcements/:id

Permanently removes the announcement so it no longer appears in the carousel.
Require the `Idempotency-Key` header. Respond `404` for unknown ids, `200`
with `{ "success": true, "message": "Announcement deleted" }`.

Note: the app dashboard also renders hardcoded slides (a bills promo and
three bundled images) plus the campaigns carousel — those live in the app
binary / campaign data and are not manageable through these endpoints.

## 4. Portal pages (for reference)

| Page | File | Backend used |
|------|------|--------------|
| Sign in | `/admin/login.html` | `/admin/auth/*` |
| Dashboard | `/admin/` | `/admin/me`, `/admin/kyc?status=ALL`, optional lists |
| KYC reviews | `/admin/kyc.html` | `/admin/kyc*` |
| Announcements | `/admin/announcements.html` | `POST`, `GET`, `PATCH /:id`, `DELETE /:id` on `/admin/announcements` |
| Legacy | `/admin.html` | redirects to `/admin/` |
| Retired | `/admin/giveaways.html` | redirects to `/admin/announcements.html` |

Shared ES modules live in `/admin/js/` (`config.js`, `api.js`, `ui.js` +
one module per page). Portal styles are `/css/admin.css` + `/admin/css/portal.css`.
