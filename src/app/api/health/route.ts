export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", service: "kiazop-bot", timestamp: new Date().toISOString() });
}
