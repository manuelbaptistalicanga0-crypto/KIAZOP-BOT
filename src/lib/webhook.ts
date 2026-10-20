import { createHmac, timingSafeEqual } from "node:crypto";

export type NormalizedWhatsAppMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: string;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/** Extracts inbound messages from a WhatsApp Cloud API webhook payload. */
export function normalizeWhatsAppWebhook(payload: unknown): NormalizedWhatsAppMessage[] {
  if (!isRecord(payload)) return [];

  const normalized: NormalizedWhatsAppMessage[] = [];
  for (const entry of records(payload.entry)) {
    for (const change of records(entry.changes)) {
      if (!isRecord(change.value)) continue;
      for (const message of records(change.value.messages)) {
        const id = typeof message.id === "string" ? message.id : "";
        const from = typeof message.from === "string" ? message.from : "";
        const timestamp = typeof message.timestamp === "string" ? message.timestamp : "";
        const type = typeof message.type === "string" ? message.type : "unknown";
        if (!id || !from || !timestamp) continue;

        const text = isRecord(message.text) && typeof message.text.body === "string"
          ? message.text.body
          : undefined;
        normalized.push({ id, from, timestamp, type, ...(text === undefined ? {} : { text }) });
      }
    }
  }
  return normalized;
}

/** Verify Meta's X-Hub-Signature-256 header against the unmodified request body. */
export function verifyMetaSignature(rawBody: string, signature: string | null, appSecret: string): boolean {
  if (!signature || !/^sha256=[a-f0-9]{64}$/i.test(signature) || !appSecret) return false;
  const supplied = Buffer.from(signature.slice("sha256=".length), "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
