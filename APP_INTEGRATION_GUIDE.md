# Disbux App Integration Guide

How the landing page, the voucher links and the mobile app fit together.

## 1. App identity (production)

| Item | Value |
|------|-------|
| Android package | `com.disbux.app` |
| iOS bundle id | `com.disbux.app` |
| Custom scheme | `disbux://` (beta builds: `disbuxbeta://`) |
| Play Store | `https://play.google.com/store/apps/details?id=com.disbux.app` |
| App Store | not published yet — see `APP_STORE_URL` in `js/share.js` |

Source of truth in the app repo: `app.config.js`.

## 2. Voucher claim links (universal links)

Every voucher code is shared with this canonical link:

```
https://disbux.com/user/redeem?claimCode={CODE}
```

How it resolves:

1. **App installed (Android)** — the `pathPrefix: /user/redeem` intent filter in
   `app.config.js` opens the redeem screen directly with `claimCode` prefilled
   (`app/user/(contest)/redeem.jsx` reads it via `useLocalSearchParams`).
2. **App installed (iOS)** — same via `applinks:disbux.com`, once the
   `.well-known/apple-app-site-association` file carries the real Apple Team ID
   (it currently says `TEAMID`) and the `/user/redeem*` path, which is already
   listed.
3. **App not installed** — the browser lands on the landing-page claim UI
   (served at the same URL by the `.htaccess` `user/redeem → claim.html`
   rewrite). That page lets the user copy the code, tap **Open in Disbux app**
   (custom scheme, with Play Store fallback on Android), or install the app.

Android App Links verification uses `.well-known/assetlinks.json`
(`delegate_permission/common.handle_all_urls` for `com.disbux.app`).
If app links stop working after a release, re-check that the
`sha256_cert_fingerprints` entry matches the signing key.

## 3. Share message template

The app generates this exact text per voucher (see `js/share.js`
`buildVoucherShareText`, covered by `tests/share.test.mjs`):

```
You've received a voucher!
Voucher code: {CODE}
Redeem securely at: https://disbux.com/user/redeem?claimCode={CODE}
Or open the Disbux app and enter the code manually.
Safety reminder: Disbux will never ask for your PIN, password or OTP to claim a voucher.
```

Replacement for `shareCode` in the app repo (`utils/helperFunctions.js`):

```js
export const shareCode = async (code) => {
  if (!code) return;
  try {
    const claimUrl = `https://disbux.com/user/redeem?claimCode=${encodeURIComponent(code)}`;
    const message =
      `You've received a voucher!\n` +
      `Voucher code: ${code}\n` +
      `Redeem securely at: ${claimUrl}\n` +
      `Or open the Disbux app and enter the code manually.\n` +
      `Safety reminder: Disbux will never ask for your PIN, password or OTP to claim a voucher.`;
    await Share.share({ message }, { dialogTitle: 'Share your voucher', subject: 'Redeemable Voucher' });
  } catch (error) {
    console.error('Error sharing:', error);
  }
};
```

## 4. Opening the app from the website

- Generic "Get the App" buttons (`js/script.js`) try `disbux://` (app root,
  which routes through `/auth`), falling back to the Play Store listing.
- The claim page (`claim.html`) uses per-platform logic in module JS:
  - Android: `intent://user/redeem?claimCode=X#Intent;scheme=disbux;package=com.disbux.app;S.browser_fallback_url=<play-store>;end`
    — opens the app when installed, Play Store otherwise.
  - iOS: tries `disbux://user/redeem?claimCode=X`, then the App Store URL once
    `APP_STORE_URL` is set; until then it shows a "coming soon" note.
  - Desktop: instructs the user to open the link on their phone.

All URL builders live in `js/share.js` so web and app stay in sync.

## 5. Testing

```bash
# Share-contract tests (landing page repo)
npm test

# Android: installed app should open the redeem screen with the code filled in
adb shell am start -W -a android.intent.action.VIEW -d "https://disbux.com/user/redeem?claimCode=TEST01"

# Android: custom scheme path
adb shell am start -W -a android.intent.action.VIEW -d "disbux://user/redeem?claimCode=TEST01"

# Verify App Links state
adb shell pm get-app-links com.disbux.app
```

Manual matrix: link with app installed → redeem screen prefilled; without the
app → claim page → copy code works → Play Store fallback works; iOS →
graceful note until the App Store listing exists.

## 6. Admin portal + backend contract

The admin portal (`/admin/`) and every backend endpoint it needs are documented
in `ADMIN_API_CONTRACT.md`, including the `ADMIN_EMAILS` allow-list and the
announcement-management endpoints the backend still has to implement.
