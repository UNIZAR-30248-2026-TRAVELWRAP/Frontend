import { test, expect, type Page } from '@playwright/test';

const EMAIL = 'adriana@travelwrap.app';
const NOMBRE = 'Adriana';

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

type Peticion = { metodo: string; autorizacion: string | undefined };

// Simula DELETE /api/perfil. No toca /api/perfil/avatar ni /api/perfil/sellos
const simularEliminar = async (page: Page, estado: number, cuerpo?: unknown) => {
  const peticiones: Peticion[] = [];
  await page.route(/\/api\/perfil$/, (route) => {
    peticiones.push({
      metodo: route.request().method(),
      autorizacion: route.request().headers()['authorization'],
    });
    return cuerpo === undefined
      ? route.fulfill({ status: estado })
      : route.fulfill({ status: estado, contentType: 'application/json', body: JSON.stringify(cuerpo) });
  });
  await page.route('**/api/perfil/sellos', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sellos: [] }) }),
  );
  return peticiones;
};

const sesionGuardada = (page: Page) => page.evaluate(() => localStorage.getItem('travelwrap.sesion'));

const pedirEliminar = async (page: Page) => {
  await page.getByRole('button', { name: /^Eliminar cuenta/ }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
};

const confirmarEliminar = (page: Page) =>
  page.getByRole('dialog').getByRole('button', { name: 'Eliminar cuenta' }).click();

test.describe('PB-47 · Eliminar cuenta', () => {
  test('«Mi Perfil» muestra la opción y al pulsarla pide confirmación sin eliminar todavía', async ({ page }) => {
    await entrarConSesion(page);
    const peticiones = await simularEliminar(page, 204);
    await page.goto('/perfil');

    await expect(page.getByText('Esta acción es permanente')).toBeVisible();
    await pedirEliminar(page);

    await expect(page.getByRole('dialog')).toContainText('¿Eliminar tu cuenta?');
    await expect(page.getByRole('dialog')).toContainText('Esta acción no se puede deshacer.');
    expect(peticiones).toHaveLength(0);
    expect(await sesionGuardada(page)).not.toBeNull();
  });



  test('si el servidor falla se muestra el error y la cuenta y la sesión siguen como estaban', async ({ page }) => {
    await entrarConSesion(page);
    const peticiones = await simularEliminar(page, 502, {
      error: { codigo: 'error_cuenta', mensaje: 'No se ha podido eliminar la cuenta' },
    });
    await page.goto('/perfil');

    await pedirEliminar(page);
    await confirmarEliminar(page);

    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('No se ha podido eliminar la cuenta');
    await expect(page).toHaveURL(/\/perfil$/);
    expect(peticiones).toHaveLength(1);
    expect(await sesionGuardada(page)).not.toBeNull();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Eliminar cuenta' })).toBeEnabled();
  });

  test('si no hay conexión se muestra el error y no se cierra la sesión', async ({ page }) => {
    await entrarConSesion(page);
    await page.route(/\/api\/perfil$/, (route) => route.abort());
    await page.route('**/api/perfil/sellos', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sellos: [] }) }),
    );
    await page.goto('/perfil');

    await pedirEliminar(page);
    await confirmarEliminar(page);

    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('No hay conexión con el servidor');
    expect(await sesionGuardada(page)).not.toBeNull();
  });
});
