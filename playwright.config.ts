import { defineConfig } from '@playwright/test';

/**
 * Pruebas end-to-end contra la app real: frontend (Vite), backend y PostgreSQL deben estar
 * corriendo (ver README). Se usa el Chrome instalado en el equipo, sin descargar navegadores.
 *   E2E_BASE_URL=https://pulso-local-frontend.vercel.app npm run e2e   ← también contra producción
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5180',
    channel: 'chrome',
    locale: 'es-CO',
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
