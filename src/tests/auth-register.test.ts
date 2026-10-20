import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/auth/register/route";

const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(() => {
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("registration readiness", () => {
  it("explains that registration is unavailable when the database is not configured", async () => {
    delete process.env.DATABASE_URL;
    const response = await POST(new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ company: "Kiala", name: "Manuel", email: "manuel@example.ao", password: "password-long-enough" }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("falta ligar a base de dados") });
  });
});
