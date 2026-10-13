import { test, expect, type Page } from '@playwright/test';

const EMAIL = 'daniel@travelwrap.app';
const NOMBRE = 'Daniel Blasco';

const sesion = {
  usuario: {
    id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
    nombre: NOMBRE,
    email: EMAIL,
    avatar_url: null,
    creado_en: '2026-10-06T15:29:32Z',
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

const entrarConSesion = async (page: Page) => {
  await page.addInitScript((datos) => {
    if (!sessionStorage.getItem('sesionSembrada')) {
      localStorage.setItem('travelwrap.sesion', JSON.stringify(datos));
      sessionStorage.setItem('sesionSembrada', '1');
    }
  }, sesion);
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'token-nuevo', refresh_token: 'refresco-nuevo' }),
    }),
  );
};

type Cierre = { metodo: string; autorizacion: string | undefined };

const simularLogout = async (page: Page, estado: number, cuerpo?: unknown) => {
  const cierres: Cierre[] = [];
  await page.route('**/api/auth/logout', (route) => {
    cierres.push({
      metodo: route.request().method(),
      autorizacion: route.request().headers()['authorization'],
    });
    return cuerpo === undefined
      ? route.fulfill({ status: estado })
      : route.fulfill({ status: estado, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  });
  return cierres;
};

const sesionGuardada = (page: Page) => page.evaluate(() => localStorage.getItem('travelwrap.sesion'));

const pedirCerrarSesion = async (page: Page) => {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
};

const confirmarCerrarSesion = (page: Page) =>
  page.getByRole('dialog').getByRole('button', { name: 'Cerrar sesión' }).click();

test.describe('PB-11 · Mi Perfil', () => {
  test('desde «Mis viajes», el avatar lleva a Mi Perfil con los datos del usuario', async ({ page }) => {
    await entrarConSesion(page);
    await page.goto('/');

    await page.getByRole('button', { name: `Perfil de ${EMAIL}` }).click();

    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByText('Mi Perfil')).toBeVisible();
    await expect(page.getByText(NOMBRE)).toBeVisible();
    await expect(page.getByText(EMAIL)).toBeVisible();
    await expect(page.getByText('Cuenta y seguridad')).toBeVisible();
  });

  test('el botón de volver lleva a «Mis viajes»', async ({ page }) => {
    await entrarConSesion(page);
    await page.goto('/perfil');

    await page.getByRole('button', { name: 'Volver' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: `Perfil de ${EMAIL}` })).toBeVisible();
  });

  test('sin sesión, /perfil lleva al login', async ({ page }) => {
    await page.goto('/perfil');

    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('PB-11 · Cerrar sesión con confirmación', () => {
  test('pulsar «Cerrar sesión» pide confirmación y no cierra todavía', async ({ page }) => {
    await entrarConSesion(page);
    const cierres = await simularLogout(page, 204);
    await page.goto('/perfil');

    await pedirCerrarSesion(page);

    await expect(page.getByRole('dialog')).toContainText('¿Cerrar sesión?');
    await expect(page.getByRole('dialog')).toContainText(
      'Tendrás que volver a introducir tus datos para acceder a TravelWrap.',
    );
    await expect(page).toHaveURL(/\/perfil$/);
    expect(cierres).toHaveLength(0);
    expect(await sesionGuardada(page)).not.toBeNull();
  });

  test('al cancelar se mantiene la sesión y se puede seguir usando la aplicación', async ({ page }) => {
    await entrarConSesion(page);
    const cierres = await simularLogout(page, 204);
    await page.goto('/perfil');

    await pedirCerrarSesion(page);
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/perfil$/);
    expect(cierres).toHaveLength(0);
    expect(await sesionGuardada(page)).not.toBeNull();

    await page.reload();
    await expect(page.getByText(NOMBRE)).toBeVisible();
  });

  test('al confirmar se avisa al backend con el token, se borra la sesión y se vuelve al login', async ({ page }) => {
    await entrarConSesion(page);
    const cierres = await simularLogout(page, 204);
    await page.goto('/perfil');

    await pedirCerrarSesion(page);
    await confirmarCerrarSesion(page);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
    expect(cierres).toEqual([{ metodo: 'POST', autorizacion: 'Bearer token-nuevo' }]);
    expect(await sesionGuardada(page)).toBeNull();
  });

  test('después de cerrar sesión, las pantallas privadas llevan al login y recargar no la recupera', async ({ page }) => {
    await entrarConSesion(page);
    await simularLogout(page, 204);
    await page.goto('/perfil');

    await pedirCerrarSesion(page);
    await confirmarCerrarSesion(page);
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/perfil');
    await expect(page).toHaveURL(/\/login$/);

    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);

    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
    expect(await sesionGuardada(page)).toBeNull();
  });

  test('si el backend rechaza el cierre, la sesión local se borra igualmente', async ({ page }) => {
    await entrarConSesion(page);
    const cierres = await simularLogout(page, 401, {
      error: { codigo: 'sesion_invalida', mensaje: 'La sesión ha caducado o no es válida' },
    });
    await page.goto('/perfil');

    await pedirCerrarSesion(page);
    await confirmarCerrarSesion(page);

    await expect(page).toHaveURL(/\/login$/);
    expect(cierres).toHaveLength(1);
    expect(await sesionGuardada(page)).toBeNull();
  });

  test('si el servidor no responde, el usuario sale igualmente de la aplicación', async ({ page }) => {
    await entrarConSesion(page);
    await page.route('**/api/auth/logout', (route) => route.abort());
    await page.goto('/perfil');

    await pedirCerrarSesion(page);
    await confirmarCerrarSesion(page);

    await expect(page).toHaveURL(/\/login$/);
    expect(await sesionGuardada(page)).toBeNull();
  });

  test('tras cerrar sesión se puede volver a iniciar sesión', async ({ page }) => {
    await entrarConSesion(page);
    await simularLogout(page, 204);
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sesion) }),
    );
    await page.goto('/perfil');

    await pedirCerrarSesion(page);
    await confirmarCerrarSesion(page);
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Contraseña').fill('secreta123');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByRole('button', { name: `Perfil de ${EMAIL}` })).toBeVisible();
  });
});
