import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeWhatsAppWebhook, verifyMetaSignature } from "@/lib/webhook";

const payload = {
  entry: [{ changes: [{ value: { messages: [
    { id: "wamid.1", from: "244900000001", timestamp: "1730000000", type: "text", text: { body: "Bom dia" } },
    { id: "wamid.2", from: "244900000002", timestamp: "1730000001", type: "image", image: { id: "media-1" } },
  ] } }] }],
};

describe("normalizeWhatsAppWebhook", () => {
  it("normalizes text and media messages without losing their type", () => {
    expect(normalizeWhatsAppWebhook(payload)).toEqual([
      { id: "wamid.1", from: "244900000001", timestamp: "1730000000", type: "text", text: "Bom dia" },
      { id: "wamid.2", from: "244900000002", timestamp: "1730000001", type: "image" },
    ]);
  });

  it("ignores status events and malformed messages", () => {
    expect(normalizeWhatsAppWebhook({ entry: [{ changes: [{ value: { statuses: [{ id: "wamid.1" }], messages: [{ id: "missing-required-fields" }] } }] }] })).toEqual([]);
  });

  it("returns an empty list for malformed or unrelated payloads", () => {
    expect(normalizeWhatsAppWebhook(null)).toEqual([]);
    expect(normalizeWhatsAppWebhook({ object: "whatsapp_business_account", entry: [] })).toEqual([]);
  });
});

describe("verifyMetaSignature", () => {
  const secret = "test-app-secret";
  const body = JSON.stringify(payload);
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  it("accepts a valid Meta HMAC signature", () => {
    expect(verifyMetaSignature(body, signature, secret)).toBe(true);
  });

  it("rejects invalid, missing, and malformed signatures", () => {
    expect(verifyMetaSignature(body, `sha256=${"0".repeat(64)}`, secret)).toBe(false);
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
    expect(verifyMetaSignature(body, "not-a-signature", secret)).toBe(false);
    expect(verifyMetaSignature(body, signature, "")).toBe(false);
  });
});
