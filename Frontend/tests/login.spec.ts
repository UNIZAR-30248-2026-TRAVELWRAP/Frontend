import { test, expect, type Page } from '@playwright/test';

const EMAIL = 'daniel@travelwrap.app';
const PASSWORD = 'secreta123';

const sesion = {
  usuario: {
    id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
    nombre: null,
    email: EMAIL,
    avatar_url: null,
    creado_en: '2026-10-06T15:29:32Z',
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

const simularLoginCorrecto = (page: Page) =>
  page.route('**/api/auth/login', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sesion) }),
  );

const simularLoginIncorrecto = (page: Page) =>
  page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { codigo: 'credenciales_invalidas', mensaje: 'Email o contraseña incorrectos' },
      }),
    }),
  );

const iniciarSesion = async (page: Page, email: string, password: string) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
};

test.describe('PB-04 · Iniciar sesión con email y contraseña', () => {
  test('sin sesión, la raíz redirige a la pantalla de login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('con credenciales válidas se accede a la aplicación', async ({ page }) => {
    await simularLoginCorrecto(page);
    await iniciarSesion(page, EMAIL, PASSWORD);

    await expect(page.getByText(`Sesión iniciada como ${EMAIL}`)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('con credenciales inválidas se muestra un error y no se accede', async ({ page }) => {
    await simularLoginIncorrecto(page);
    await iniciarSesion(page, EMAIL, 'incorrecta');

    await expect(page.getByRole('alert')).toHaveText('Email o contraseña incorrectos');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('si el servidor no responde se avisa al usuario', async ({ page }) => {
    await page.route('**/api/auth/login', (route) => route.abort());
    await iniciarSesion(page, EMAIL, PASSWORD);

    await expect(page.getByRole('alert')).toHaveText('No se puede conectar con el servidor');
  });

  test('la sesión se mantiene al recargar la página', async ({ page }) => {
    await simularLoginCorrecto(page);
    let refreshRecibido: unknown = null;
    await page.route('**/api/auth/refresh', (route) => {
      refreshRecibido = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'token-nuevo', refresh_token: 'refresco-nuevo' }),
      });
    });

    await iniciarSesion(page, EMAIL, PASSWORD);
    await expect(page.getByText(`Sesión iniciada como ${EMAIL}`)).toBeVisible();

    await page.reload();

    await expect(page.getByText(`Sesión iniciada como ${EMAIL}`)).toBeVisible();
    expect(refreshRecibido).toEqual({ refresh_token: 'token-refresco' });
  });

  test('si la sesión guardada ha caducado se vuelve al login', async ({ page }) => {
    await page.addInitScript((datos) => {
      localStorage.setItem('travelwrap.sesion', JSON.stringify(datos));
    }, sesion);
    await page.route('**/api/auth/refresh', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { codigo: 'sesion_invalida', mensaje: 'La sesión ha caducado o no es válida' },
        }),
      }),
    );

    await page.goto('/');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });
});
