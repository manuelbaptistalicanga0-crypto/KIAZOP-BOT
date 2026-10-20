import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      include: ["src/lib/{bot,crypto,plans,webhook}.ts", "src/app/api/webhooks/whatsapp/route.ts", "src/app/api/health/route.ts"],
      reporter: ["text", "html"],
    },
  },
});
