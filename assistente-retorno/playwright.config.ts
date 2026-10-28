import { defineConfig, devices } from "@playwright/test";

const PORT = 3310;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Requer `next build` antes (o script test:e2e já faz isso). Banco novo a cada execução.
    command: `rm -rf .e2e-data && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      DATABASE_PATH: ".e2e-data/e2e.db",
      SEED_DEMO: "true",
      INSECURE_COOKIES: "true",
      AI_PROVIDER: "demo",
    },
  },
});
