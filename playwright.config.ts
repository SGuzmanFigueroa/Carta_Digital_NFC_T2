import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de punta a punta (Tarea 45). Localmente reutilizan `npm run dev` si ya
 * corre en el puerto 3000; si no, lo levantan.
 *
 * Las pruebas que necesitan Supabase real (login demo, panel) se saltan solas
 * cuando faltan NEXT_PUBLIC_SUPABASE_URL / ANON_KEY (p. ej. en el CI sin secretos).
 * Ninguna prueba crea pedidos ni modifica datos.
 */

// Mismas variables que usa Next en local (las pruebas deciden qué saltar). Se
// quita el BOM que deja el Bloc de notas de Windows: Next lo tolera, parseEnv no.
try {
  const vars = parseEnv(readFileSync('.env.local', 'utf8').replace(/^﻿/, ''));
  for (const [key, value] of Object.entries(vars)) process.env[key] ??= value;
} catch {
  // Sin .env.local (CI): se usan las variables del entorno.
}

const PORT = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // El service worker sirve la carta guardada sin conexión: en pruebas confunde.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-PE'
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'celular', use: { ...devices['Pixel 7'] }, testMatch: /carta\.spec\.ts/ }
  ],
  webServer: {
    command: process.env.CI ? `npm run start -- -p ${PORT}` : 'npm run dev',
    url: `http://localhost:${PORT}/menu`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
});
