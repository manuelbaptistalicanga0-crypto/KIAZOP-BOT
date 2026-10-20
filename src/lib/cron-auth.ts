import { timingSafeEqual } from "node:crypto";

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  if (!secret || !bearer) return false;
  const expected = Buffer.from(secret);
  const provided = Buffer.from(bearer);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
