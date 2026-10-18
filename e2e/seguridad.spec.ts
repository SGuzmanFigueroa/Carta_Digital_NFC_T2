import { expect, test } from '@playwright/test';

/** Cabeceras de seguridad del sitio (CSP y permisos del navegador). */

test('la carta envía la CSP y permite cámara y ubicación solo al propio sitio', async ({ request }) => {
  const res = await request.get('/menu');
  const csp = res.headers()['content-security-policy'] ?? '';
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("frame-ancestors 'self'");
  // Supabase (datos y realtime) tiene que poder conectarse.
  expect(csp).toMatch(/connect-src [^;]*https:\/\/[a-z0-9]+\.supabase\.co/);
  expect(csp).toMatch(/connect-src [^;]*wss:\/\/[a-z0-9]+\.supabase\.co/);

  // La geocerca antifraude necesita la ubicación del comensal.
  expect(res.headers()['permissions-policy']).toContain('geolocation=(self)');
});

test('la carta funciona sin violaciones de la CSP', async ({ page }) => {
  const violations: string[] = [];
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text());
  });
  await page.goto('/menu?mesa=5');
  await expect(page.getByRole('button', { name: /Agregar • S\// }).first()).toBeVisible();
  expect(violations).toEqual([]);
});
