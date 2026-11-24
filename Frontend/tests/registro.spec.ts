import { test, expect, type Page } from '@playwright/test';

const NOMBRE = 'Daniel Blasco';
const EMAIL = 'daniel@travelwrap.app';
const PASSWORD = 'secreta123';

const usuario = {
  id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
  nombre: NOMBRE,
  email: EMAIL,
  avatar_url: null,
  creado_en: '2026-10-11T18:00:00Z',
};

const simularRegistro = (page: Page, estado: number, cuerpo: unknown) =>
  page.route('**/api/auth/registro', (route) =>
    route.fulfill({ status: estado, contentType: 'application/json', body: JSON.stringify(cuerpo) }),
  );

const rellenarRegistro = async (page: Page, datos: { nombre: string; email: string; password: string; confirmacion: string }) => {
  await page.getByLabel('Nombre', { exact: true }).fill(datos.nombre);
  await page.getByLabel('Email', { exact: true }).fill(datos.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(datos.password);
  await page.getByLabel('Repite la contraseña', { exact: true }).fill(datos.confirmacion);
};

const datosValidos = { nombre: NOMBRE, email: EMAIL, password: PASSWORD, confirmacion: PASSWORD };

test.describe('PB-06 · Registrarse con email', () => {
  test('desde el login se llega al registro y se puede volver', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Regístrate' }).click();

    await expect(page).toHaveURL(/\/registro$/);
    await expect(page.getByText('Crea tu cuenta')).toBeVisible();

    await page.getByRole('button', { name: 'Inicia sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('envía los datos al backend y avisa de que hay que confirmar el correo', async ({ page }) => {
    let enviado: unknown = null;
    await page.route('**/api/auth/registro', (route) => {
      enviado = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ usuario, confirmacion_pendiente: true }),
      });
    });

    await page.goto('/registro');
    await rellenarRegistro(page, { ...datosValidos, nombre: `  ${NOMBRE}  ` });
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('status')).toHaveText(
      'Cuenta creada. Revisa tu correo y confirma tu email para iniciar sesión',
    );
    expect(enviado).toEqual({ nombre: NOMBRE, email: EMAIL, password: PASSWORD });
    await expect(page).toHaveURL(/\/registro$/);
    expect(await page.evaluate(() => localStorage.getItem('travelwrap.sesion'))).toBeNull();
  });

  test('si el backend devuelve sesión, el usuario entra directamente en la aplicación', async ({ page }) => {
    await simularRegistro(page, 201, { usuario, token: 'token-acceso', refresh_token: 'token-refresco' });

    await page.goto('/registro');
    await rellenarRegistro(page, datosValidos);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('button', { name: `Perfil de ${EMAIL}` })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('si el email ya tiene cuenta se muestra el error', async ({ page }) => {
    await simularRegistro(page, 409, {
      error: { codigo: 'email_en_uso', mensaje: 'Ya existe una cuenta con ese email' },
    });

    await page.goto('/registro');
    await rellenarRegistro(page, datosValidos);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();

    await expect(page.getByRole('alert')).toHaveText('Ya existe una cuenta con ese email');
    await expect(page).toHaveURL(/\/registro$/);
  });

  test('con datos no válidos avisa en cada campo y no deja enviar', async ({ page }) => {
    let llamadas = 0;
    await page.route('**/api/auth/registro', (route) => {
      llamadas++;
      return route.fulfill({ status: 201, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/registro');
    await rellenarRegistro(page, { nombre: NOMBRE, email: 'daniel@', password: 'corta', confirmacion: 'otra' });

    await expect(page.getByText('Introduce un email válido')).toBeVisible();
    await expect(page.getByText('La contraseña debe tener al menos 8 caracteres')).toBeVisible();
    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
    expect(llamadas).toBe(0);
  });

});

