import { expect, test, type Page } from '@playwright/test';

/** Carta del comensal: solo lectura y carrito local, nunca envía pedidos. */

async function openMenu(page: Page) {
  await page.goto('/menu?mesa=5');
  // La carta viene renderizada del servidor: hay platos antes de hidratar.
  await expect(page.getByRole('button', { name: /Agregar • S\// }).first()).toBeVisible();
}

test('la carta llega renderizada del servidor con platos y título del local', async ({ request }) => {
  const res = await request.get('/menu');
  expect(res.ok()).toBeTruthy();
  const html = await res.text();
  expect(html).toContain('S/');
  expect(html).toMatch(/<title>[^<]*Carta digital<\/title>/);
});

test('el QR de la mesa queda vinculado y el código secreto no queda en la URL', async ({ page }) => {
  await page.goto('/menu?mesa=7&t=codigo-de-prueba');
  await expect(page.getByText(/Mesa 07/).first()).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get('t')).toBeNull();
});

test('agregar al carrito, revisar el pedido y cerrarlo con Esc', async ({ page }) => {
  await openMenu(page);
  const add = page.getByRole('button', { name: /Agregar • S\// }).first();
  await add.click();
  await add.click();

  await page.getByRole('button', { name: 'Ver Pedido', exact: true }).click();
  const cart = page.getByRole('dialog', { name: /Tu Pedido/ });
  await expect(cart).toBeVisible();
  await expect(cart.getByText(/TOTAL A PAGAR/)).toBeVisible();

  // Accesibilidad (Tarea 40): el foco entra al modal y Esc lo cierra.
  await expect(cart.getByRole('button', { name: /Cerrar mi pedido/ })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(cart).toBeHidden();
  await expect(page.getByRole('button', { name: 'Ver Pedido', exact: true })).toBeFocused();
});

test('las notas de cocina se escriben en el carrito', async ({ page }) => {
  await openMenu(page);
  await page.getByRole('button', { name: /Agregar • S\// }).first().click();
  await page.getByRole('button', { name: 'Ver Pedido', exact: true }).click();
  const cart = page.getByRole('dialog', { name: /Tu Pedido/ });
  await cart.getByRole('button', { name: /nota de cocina/i }).click();
  const note = cart.locator('textarea, input[type="text"]').first();
  await note.fill('sin hielo');
  await expect(note).toHaveValue('sin hielo');
});

test('cambiar el idioma de la carta a inglés', async ({ page }) => {
  await openMenu(page);
  await page.getByRole('button', { name: 'Cambiar el idioma de la carta' }).click();
  await expect(page.getByRole('button', { name: /Add • S\// }).first()).toBeVisible();
  // Se deja como estaba para no afectar las demás pruebas. El botón ignora a
  // propósito los clics a menos de 120 ms del anterior (anti-rebote).
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'Change the menu language' }).click();
  await expect(page.getByRole('button', { name: /Agregar • S\// }).first()).toBeVisible();
});
