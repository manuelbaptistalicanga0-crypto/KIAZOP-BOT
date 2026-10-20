import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/webhooks/whatsapp/route";

const env = process.env as unknown as Record<string, string | undefined>;
const originalEnvironment = {
  token: process.env.META_WEBHOOK_VERIFY_TOKEN,
  secret: process.env.META_APP_SECRET,
  nodeEnv: process.env.NODE_ENV,
};

beforeEach(() => {
  process.env.META_WEBHOOK_VERIFY_TOKEN = "local-test-token";
  process.env.META_APP_SECRET = "";
  env.NODE_ENV = "test";
});

afterEach(() => {
  if (originalEnvironment.token === undefined) delete process.env.META_WEBHOOK_VERIFY_TOKEN;
  else process.env.META_WEBHOOK_VERIFY_TOKEN = originalEnvironment.token;
  if (originalEnvironment.secret === undefined) delete process.env.META_APP_SECRET;
  else process.env.META_APP_SECRET = originalEnvironment.secret;
  if (originalEnvironment.nodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = originalEnvironment.nodeEnv;
});

describe("WhatsApp webhook route", () => {
  it("returns the Meta challenge only for a matching verification token", async () => {
    const ok = GET(new Request("http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=local-test-token&hub.challenge=challenge-123"));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("challenge-123");

    const denied = GET(new Request("http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge-123"));
    expect(denied.status).toBe(403);
  });

  it("requires verification configuration and the subscribe mode", () => {
    delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    expect(GET(new Request("http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=local-test-token&hub.challenge=x")).status).toBe(403);
    process.env.META_WEBHOOK_VERIFY_TOKEN = "local-test-token";
    expect(GET(new Request("http://localhost/api/webhooks/whatsapp?hub.mode=other&hub.verify_token=local-test-token&hub.challenge=x")).status).toBe(403);
  });

  it("normalizes a valid JSON webhook without requiring external services", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ id: "wamid.route", from: "244900000000", timestamp: "1730000000", type: "text", text: { body: "Olá" } }] } }] }] }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ received: true, count: 1, messages: [{ text: "Olá" }] });
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/whatsapp", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });

  it("checks configured signatures and requires a secret in production", async () => {
    process.env.META_APP_SECRET = "secret";
    const invalidSignature = await POST(new Request("http://localhost/api/webhooks/whatsapp", {
      method: "POST",
      headers: { "x-hub-signature-256": `sha256=${"0".repeat(64)}` },
      body: "{}",
    }));
    expect(invalidSignature.status).toBe(401);

    process.env.META_APP_SECRET = "";
    env.NODE_ENV = "production";
    const noProductionSecret = await POST(new Request("http://localhost/api/webhooks/whatsapp", { method: "POST", body: "{}" }));
    expect(noProductionSecret.status).toBe(503);
  });
});
