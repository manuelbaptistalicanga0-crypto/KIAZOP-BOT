import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, hashVerifyToken, safeHashEqual } from "@/lib/crypto";
import { PLAN_LIMITS } from "@/lib/plans";

const originalKey = process.env.ENCRYPTION_KEY;
const key = Buffer.from("12345678901234567890123456789012").toString("base64");
afterEach(() => {
  if (originalKey === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = originalKey;
});

describe("tenant secret encryption", () => {
  it("encrypts with a random nonce and decrypts to the original value", () => {
    process.env.ENCRYPTION_KEY = key;
    const first = encryptSecret("meta-access-token");
    const second = encryptSecret("meta-access-token");
    expect(first).not.toBe(second);
    expect(decryptSecret(first)).toBe("meta-access-token");
  });

  it("fails closed when the encryption key is missing or malformed", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptSecret("secret")).toThrow("ENCRYPTION_KEY");
    process.env.ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    expect(() => encryptSecret("secret")).toThrow("32 bytes");
  });

  it("hashes verification tokens and compares digests safely", () => {
    const hash = hashVerifyToken("random-verify-token");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(safeHashEqual(hash, hash)).toBe(true);
    expect(safeHashEqual(hash, hashVerifyToken("another-token"))).toBe(false);
    expect(safeHashEqual("invalid", "")).toBe(false);
  });
});

describe("plan limits", () => {
  it("assigns bounded quotas to Free and Pro and no hard cap to Enterprise", () => {
    expect(PLAN_LIMITS.FREE).toEqual({ employees: 5, activeTasks: 100, monthlyMessages: 500 });
    expect(PLAN_LIMITS.PRO).toEqual({ employees: 50, activeTasks: 2_000, monthlyMessages: 20_000 });
    expect(PLAN_LIMITS.ENTERPRISE.monthlyMessages).toBe(Number.POSITIVE_INFINITY);
  });
});
