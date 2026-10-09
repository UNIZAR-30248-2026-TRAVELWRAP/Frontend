import { test, expect, type Page } from '@playwright/test';

const EMAIL = 'daniel@gmail.com';

const sesion = {
  usuario: {
    id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
    nombre: 'Daniel Blasco',
    email: EMAIL,
    avatar_url: 'https://lh3.googleusercontent.com/a/foto',
    creado_en: '2026-10-08T10:00:00Z',
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

const codificar = (valor: unknown) => Buffer.from(JSON.stringify(valor)).toString('base64url');

const simularBackendGoogle = (page: Page, fragmento: string) =>
  page.route('**/api/auth/google', (route) =>
    route.fulfill({
      status: 302,
      headers: { Location: `${new URL(page.url()).origin}/auth/callback#${fragmento}` },
    }),
  );

const pulsarGoogle = async (page: Page) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
};

test.describe('PB-05 · Iniciar sesión con Google (OAuth)', () => {
  test('el botón «Continuar con Google» lleva al endpoint de Google del backend', async ({ page }) => {
    let solicitada = '';
    await page.route('**/api/auth/google', (route) => {
      solicitada = route.request().url();
      return route.fulfill({ status: 200, contentType: 'text/plain', body: 'ok' });
    });

    await pulsarGoogle(page);

    await expect.poll(() => solicitada).toMatch(/\/api\/auth\/google$/);
  });

  test('si Google acepta, se entra en la aplicación con la cuenta de Google', async ({ page }) => {
    await simularBackendGoogle(page, `sesion=${codificar(sesion)}`);

    await pulsarGoogle(page);

    await expect(page.getByText(`Sesión iniciada como ${EMAIL}`)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('la sesión de Google se guarda y se mantiene al recargar', async ({ page }) => {
    await simularBackendGoogle(page, `sesion=${codificar(sesion)}`);
    let refreshRecibido: unknown = null;
    await page.route('**/api/auth/refresh', (route) => {
      refreshRecibido = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'token-nuevo', refresh_token: 'refresco-nuevo' }),
      });
    });

    await pulsarGoogle(page);
    await expect(page.getByText(`Sesión iniciada como ${EMAIL}`)).toBeVisible();

    const guardada = await page.evaluate(() => JSON.parse(localStorage.getItem('travelwrap.sesion') ?? 'null'));
    expect(guardada).toEqual(sesion);

    await page.reload();

    await expect(page.getByText(`Sesión iniciada como ${EMAIL}`)).toBeVisible();
    expect(refreshRecibido).toEqual({ refresh_token: 'token-refresco' });
  });

  test('si el usuario cancela en Google, vuelve al login con un aviso', async ({ page }) => {
    await simularBackendGoogle(page, 'error=google_cancelado');

    await pulsarGoogle(page);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toHaveText('Has cancelado el inicio de sesión con Google');
  });

  test('si el backend no puede completar el login, vuelve al login con un error', async ({ page }) => {
    await simularBackendGoogle(page, 'error=google');

    await pulsarGoogle(page);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toHaveText('No se ha podido iniciar sesión con Google');
  });

  test('una respuesta manipulada no inicia sesión', async ({ page }) => {
    await page.goto('/auth/callback#sesion=manipulada');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('alert')).toHaveText('No se ha podido iniciar sesión con Google');
    expect(await page.evaluate(() => localStorage.getItem('travelwrap.sesion'))).toBeNull();
  });
});
