import { createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";

function encryptionKey(): Buffer {
  const encoded = process.env.ENCRYPTION_KEY;
  if (!encoded) throw new Error("ENCRYPTION_KEY não configurada.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY deve ser uma chave Base64 de 32 bytes.");
  return key;
}

/** Encriptação autenticada: IV + tag GCM + conteúdo, todos em base64url. */
export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(value: string): string {
  const [encodedIv, encodedTag, encodedContent] = value.split(".");
  if (!encodedIv || !encodedTag || !encodedContent) throw new Error("Segredo encriptado inválido.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(encodedIv, "base64url"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encodedContent, "base64url")), decipher.final()]).toString("utf8");
}

export function hashVerifyToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function safeHashEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
