import { expect, test } from '@playwright/test';

/** Acceso del personal. Ninguna prueba cambia datos. */

// En el CI la URL es ficticia (ci-placeholder): ahí no hay base de datos que probar.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const hasBackend = Boolean(supabaseUrl && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !supabaseUrl.includes('placeholder'));
const demoEnabled = process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED !== 'false';

test('las pantallas del personal piden iniciar sesión', async ({ page }) => {
  for (const path of ['/pedidos', '/kds', '/dashboard', '/configuracion', '/personal']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get('redirect')).toBe(path);
  }
});

test('la API no entrega datos del personal sin sesión', async ({ request }) => {
  const res = await request.post('/api/staff', { data: {} });
  expect([401, 403]).toContain(res.status());
});

test.describe('con Supabase', () => {
  test.skip(!hasBackend, 'Faltan NEXT_PUBLIC_SUPABASE_URL / ANON_KEY');

  test('una contraseña incorrecta muestra el error y no entra', async ({ page }) => {
    await page.goto('/login');
    // Usuario inventado distinto cada vez: no bloquea cuentas reales.
    await page.getByLabel('Usuario o correo').fill(`e2e_no_existe_${Date.now()}`);
    await page.getByLabel('Contraseña', { exact: true }).fill('clave-incorrecta-123');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('acceso demo de administrador, panel y bloqueo de terminal', async ({ page }) => {
    test.skip(!demoEnabled, 'Accesos demo desactivados');
    await page.goto('/login');
    await page.getByRole('button', { name: /Admin \/ Gerente/ }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
    await expect(page.getByText('Demo Admin').first()).toBeAttached();

    // Bloqueo manual: aparece la pantalla de PIN y Esc no la salta.
    await page.getByRole('button', { name: 'Bloquear terminal' }).click();
    const lock = page.getByRole('dialog', { name: 'Terminal bloqueada por inactividad' });
    await expect(lock).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(lock).toBeVisible();

    // Salir con "¿No eres tú? Cerrar Sesión" sin gastar intentos de PIN.
    await lock.getByRole('button', { name: 'Cerrar Sesión' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/pedidos');
    await expect(page).toHaveURL(/\/login\?/);
  });
});
