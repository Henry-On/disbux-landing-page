import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ANDROID_PACKAGE,
  APP_STORE_URL,
  PLAY_STORE_URL,
  buildAndroidIntentClaimUrl,
  buildAppClaimUrl,
  buildClaimUrl,
  buildVoucherShareText,
  isValidVoucherCode,
  normalizeVoucherCode,
  parseClaimCodeFromUrl,
  storeUrlForPlatform,
} from "../js/share.js";

describe("voucher share contract", () => {
  it("builds the exact share message", () => {
    assert.equal(
      buildVoucherShareText("k7p4q2"),
      [
        "You've received a voucher!",
        "Voucher code: K7P4Q2",
        "Redeem securely at: https://disbux.com/user/redeem?claimCode=K7P4Q2",
        "Or open the Disbux app and enter the code manually.",
        "Safety reminder: Disbux will never ask for your PIN, password or OTP to claim a voucher.",
      ].join("\n"),
    );
  });

  it("rejects blank or malformed codes", () => {
    assert.equal(isValidVoucherCode(""), false);
    assert.equal(isValidVoucherCode("ab"), false);
    assert.equal(isValidVoucherCode("K7 P4"), false);
    assert.equal(isValidVoucherCode("K7P4Q2"), true);
    assert.throws(() => buildVoucherShareText("  "), /valid voucher code/);
    assert.throws(() => buildClaimUrl("no spaces allowed"), /valid voucher code/);
  });

  it("normalizes codes to trimmed upper-case in links", () => {
    assert.equal(normalizeVoucherCode("  k7p4q2 "), "k7p4q2");
    assert.equal(buildClaimUrl("  k7p4q2 "), "https://disbux.com/user/redeem?claimCode=K7P4Q2");
    assert.equal(buildAppClaimUrl("k7p4q2"), "disbux://user/redeem?claimCode=K7P4Q2");
  });

  it("sends Android users without the app to the Play Store", () => {
    assert.equal(
      buildAndroidIntentClaimUrl("k7p4q2"),
      `intent://user/redeem?claimCode=K7P4Q2#Intent;scheme=disbux;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`,
    );
    assert.equal(storeUrlForPlatform("android"), PLAY_STORE_URL);
    assert.equal(storeUrlForPlatform("ios"), APP_STORE_URL);
    assert.equal(storeUrlForPlatform("desktop"), "");
  });

  it("parses claim codes back out of share links", () => {
    const text = buildVoucherShareText("K7P4Q2");
    const url = text.match(/https:\S+/)[0];
    assert.equal(parseClaimCodeFromUrl(url), "K7P4Q2");
    assert.equal(parseClaimCodeFromUrl("https://disbux.com/claim?code=k7p4q2"), "K7P4Q2");
    assert.equal(parseClaimCodeFromUrl("https://disbux.com/claim?voucher=k7p4q2"), "K7P4Q2");
    assert.equal(parseClaimCodeFromUrl("https://disbux.com/user/redeem#claimCode=k7p4q2"), "K7P4Q2");
    assert.equal(parseClaimCodeFromUrl("https://disbux.com/user/redeem"), "");
    assert.equal(parseClaimCodeFromUrl("not a url at all ["), "");
  });
});
