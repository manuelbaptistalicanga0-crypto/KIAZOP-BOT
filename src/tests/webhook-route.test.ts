import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashVerifyToken } from "@/lib/crypto";

const mocks = vi.hoisted(() => ({
  getPrisma: vi.fn(),
  processWebhookEvent: vi.fn(),
  after: vi.fn(),
  findFirstConfig: vi.fn(),
  findUniqueConfig: vi.fn(),
  createEvent: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ getPrisma: mocks.getPrisma }));
vi.mock("@/lib/bot", () => ({ processWebhookEvent: mocks.processWebhookEvent }));
vi.mock("next/server", () => ({ after: mocks.after }));

import { GET, POST } from "@/app/api/webhooks/whatsapp/route";

const env = process.env as unknown as Record<string, string | undefined>;
const originalEnvironment = { secret: process.env.META_APP_SECRET, nodeEnv: process.env.NODE_ENV };
const configLookup = { findFirst: mocks.findFirstConfig, findUnique: mocks.findUniqueConfig };
const eventStore = { create: mocks.createEvent };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getPrisma.mockReturnValue({ whatsAppConfig: configLookup, webhookEvent: eventStore });
  mocks.after.mockImplementation(() => undefined);
  env.NODE_ENV = "test";
  process.env.META_APP_SECRET = "";
});

afterEach(() => {
  if (originalEnvironment.secret === undefined) delete process.env.META_APP_SECRET;
  else process.env.META_APP_SECRET = originalEnvironment.secret;
  if (originalEnvironment.nodeEnv === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = originalEnvironment.nodeEnv;
});

describe("WhatsApp webhook route", () => {
  it("returns the Meta challenge only for a matching stored token", async () => {
    mocks.findFirstConfig.mockResolvedValue({ verifyTokenHash: hashVerifyToken("local-test-token") });
    const ok = await GET(new Request("http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=local-test-token&hub.challenge=challenge-123"));
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("challenge-123");
    expect(mocks.findFirstConfig).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ enabled: true }) }));

    mocks.findFirstConfig.mockResolvedValue(null);
    const denied = await GET(new Request("http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge-123"));
    expect(denied.status).toBe(403);
  });

  it("rejects incomplete verification requests", async () => {
    const response = await GET(new Request("http://localhost/api/webhooks/whatsapp?hub.mode=other"));
    expect(response.status).toBe(403);
    expect(mocks.findFirstConfig).not.toHaveBeenCalled();
  });

  it("persists the event before acknowledging Meta", async () => {
    mocks.findUniqueConfig.mockResolvedValue({ tenantId: "tenant-a", enabled: true });
    mocks.createEvent.mockResolvedValue({ id: "event-1" });
    const body = JSON.stringify({ entry: [{ changes: [{ value: { metadata: { phone_number_id: "987654321" }, messages: [{ id: "wamid.route", from: "244900000000", timestamp: "1730000000", type: "text", text: { body: "FEITO" } }] } }] }] });
    const response = await POST(new Request("http://localhost/api/webhooks/whatsapp", { method: "POST", headers: { "content-type": "application/json" }, body }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(mocks.createEvent).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: "tenant-a", providerEventId: "wamid.route" }) }));
    expect(mocks.after).toHaveBeenCalledOnce();
  });

  it("returns 400 for invalid JSON", async () => {
    const response = await POST(new Request("http://localhost/api/webhooks/whatsapp", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });

  it("checks configured signatures and requires a secret in production", async () => {
    process.env.META_APP_SECRET = "secret";
    const invalidSignature = await POST(new Request("http://localhost/api/webhooks/whatsapp", {
      method: "POST", headers: { "x-hub-signature-256": `sha256=${"0".repeat(64)}` }, body: "{}",
    }));
    expect(invalidSignature.status).toBe(401);
    process.env.META_APP_SECRET = "";
    env.NODE_ENV = "production";
    const noProductionSecret = await POST(new Request("http://localhost/api/webhooks/whatsapp", { method: "POST", body: "{}" }));
    expect(noProductionSecret.status).toBe(503);
  });
});
