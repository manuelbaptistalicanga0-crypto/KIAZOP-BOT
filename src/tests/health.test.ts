import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/health/route";

describe("health endpoint", () => {
  it("reports that the demo API is healthy", async () => {
    const response = GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: "ok", service: "kiazop-bot" });
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});
