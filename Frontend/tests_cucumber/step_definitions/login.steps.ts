import { fileURLToPath } from 'node:url';
import { After, AfterAll, Before, BeforeAll, Given, Then, When, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, expect, type Browser, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

const PUERTO = 5174;
const URL_APP = `http://localhost:${PUERTO}`;

setDefaultTimeout(30000);

let servidor: ViteDevServer;
let navegador: Browser;
let pagina: Page;
let usuario: { email: string; password: string } | null = null;

BeforeAll(async () => {
  servidor = await createServer({
    configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
    root: fileURLToPath(new URL('../../', import.meta.url)),
    server: { port: PUERTO, strictPort: true },
    logLevel: 'silent',
  });
  await servidor.listen();
  navegador = await chromium.launch({ headless: true });
});

AfterAll(async () => {
  await navegador?.close();
  await servidor?.close();
});

Before(async () => {
  usuario = null;
  pagina = await navegador.newPage();
});

After(async () => {
  await pagina?.close();
});

Given('que existe un usuario registrado con email {string} y contraseña {string}', async (email: string, password: string) => {
  usuario = { email, password };

  await pagina.route('**/api/auth/login', async (route) => {
    const datos = route.request().postDataJSON();
    if (usuario && datos.email === usuario.email && datos.password === usuario.password) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          usuario: {
            id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
            nombre: null,
            email: usuario.email,
            avatar_url: null,
            creado_en: '2026-10-06T15:29:32Z',
          },
          token: 'token-acceso',
          refresh_token: 'token-refresco',
        }),
      });
    }
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { codigo: 'credenciales_invalidas', mensaje: 'Email o contraseña incorrectos' },
      }),
    });
  });

  await pagina.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'token-nuevo', refresh_token: 'refresco-nuevo' }),
    }),
  );
});

const simularRespuestaGoogle = async (fragmento: string) => {
  await pagina.route('**/api/auth/google', (route) =>
    route.fulfill({ status: 302, headers: { Location: `${URL_APP}/auth/callback#${fragmento}` } }),
  );
  await pagina.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'token-nuevo', refresh_token: 'refresco-nuevo' }),
    }),
  );
};

const sesionGoogle = (email: string, nombre: string) =>
  Buffer.from(
    JSON.stringify({
      usuario: {
        id: 'a1b2c3d4-0000-4000-8000-000000000001',
        nombre,
        email,
        avatar_url: 'https://lh3.googleusercontent.com/a/foto',
        creado_en: '2026-10-08T10:00:00Z',
      },
      token: 'token-acceso-google',
      refresh_token: 'token-refresco-google',
    }),
  ).toString('base64url');

Given('que mi cuenta de Google {string} con nombre {string} acepta iniciar sesión en TravelWrap', async (email: string, nombre: string) => {
  await simularRespuestaGoogle(`sesion=${sesionGoogle(email, nombre)}`);
});

Given('que cancelo el inicio de sesión en la pantalla de Google', async () => {
  await simularRespuestaGoogle('error=google_cancelado');
});

Given('que el servidor no puede completar el inicio de sesión con Google', async () => {
  await simularRespuestaGoogle('error=google');
});

Given('que estoy en la pantalla de inicio de sesión', async () => {
  await pagina.goto(`${URL_APP}/login`);
  await expect(pagina.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
});

Given('que he iniciado sesión con el email {string} y la contraseña {string}', async (email: string, password: string) => {
  await pagina.goto(`${URL_APP}/login`);
  await pagina.getByLabel('Email').fill(email);
  await pagina.getByLabel('Contraseña').fill(password);
  await pagina.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(pagina.getByRole('button', { name: `Perfil de ${email}` })).toBeVisible();
});

When('introduzco el email {string} y la contraseña {string}', async (email: string, password: string) => {
  await pagina.getByLabel('Email').fill(email);
  await pagina.getByLabel('Contraseña').fill(password);
});

When('pulso el botón {string}', async (texto: string) => {
  await pagina.getByRole('button', { name: texto }).click();
});

When('recargo la aplicación', async () => {
  await pagina.reload();
});

Then('accedo a la aplicación con la sesión de {string}', async (email: string) => {
  await expect(pagina.getByRole('button', { name: `Perfil de ${email}` })).toBeVisible();
  await expect(pagina).not.toHaveURL(/\/login$/);
});

Then('veo el mensaje de error {string}', async (mensaje: string) => {
  await expect(pagina.getByRole('alert')).toHaveText(mensaje);
});

Then('sigo en la pantalla de inicio de sesión', async () => {
  await expect(pagina).toHaveURL(/\/login$/);
});

const cuentasRegistradas = new Set<string>();

Before(() => {
  cuentasRegistradas.clear();
});

const simularBackendRegistro = async () => {
  await pagina.route('**/api/auth/registro', (route) => {
    const datos = route.request().postDataJSON();
    if (cuentasRegistradas.has(datos.email)) {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ error: { codigo: 'email_en_uso', mensaje: 'Ya existe una cuenta con ese email' } }),
      });
    }
    cuentasRegistradas.add(datos.email);
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        usuario: {
          id: 'b2c3d4e5-0000-4000-8000-000000000002',
          nombre: datos.nombre,
          email: datos.email,
          avatar_url: null,
          creado_en: '2026-10-11T18:00:00Z',
        },
        confirmacion_pendiente: true,
      }),
    });
  });
};

Given('que no existe ninguna cuenta con el email {string}', async (email: string) => {
  cuentasRegistradas.delete(email);
  await simularBackendRegistro();
});

Given('que ya existe una cuenta con el email {string}', async (email: string) => {
  cuentasRegistradas.add(email);
  await simularBackendRegistro();
});

Given('que tengo una cuenta con el email {string} pendiente de confirmar', async (email: string) => {
  await pagina.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { codigo: 'email_no_confirmado', mensaje: 'El email no está confirmado' } }),
    }),
  );
  await pagina.route('**/api/auth/reenviar-confirmacion', (route) => {
    const datos = route.request().postDataJSON();
    return route.fulfill({
      status: datos.email === email ? 202 : 400,
      contentType: 'application/json',
      body: JSON.stringify({ mensaje: 'ok' }),
    });
  });
});

Given('que estoy en la pantalla de registro', async () => {
  await pagina.goto(`${URL_APP}/registro`);
  await expect(pagina.getByRole('button', { name: 'Crear cuenta' })).toBeVisible();
});

When('relleno el registro con nombre {string}, email {string} y contraseña {string}', async (nombre: string, email: string, password: string) => {
  await pagina.getByLabel('Nombre', { exact: true }).fill(nombre);
  await pagina.getByLabel('Email', { exact: true }).fill(email);
  await pagina.getByLabel('Contraseña', { exact: true }).fill(password);
  await pagina.getByLabel('Repite la contraseña', { exact: true }).fill(password);
});

When('repito la contraseña como {string}', async (confirmacion: string) => {
  await pagina.getByLabel('Repite la contraseña', { exact: true }).fill(confirmacion);
});

Then('veo el aviso {string}', async (mensaje: string) => {
  await expect(pagina.getByRole('status')).toHaveText(mensaje);
});

Then('veo un error que contiene {string}', async (mensaje: string) => {
  await expect(pagina.getByRole('alert')).toContainText(mensaje);
});

Then('veo junto al campo el aviso {string}', async (mensaje: string) => {
  await expect(pagina.getByText(mensaje, { exact: true })).toBeVisible();
});

Then('el botón {string} está desactivado', async (texto: string) => {
  await expect(pagina.getByRole('button', { name: texto })).toBeDisabled();
});

Then('sigo en la pantalla de registro', async () => {
  await expect(pagina).toHaveURL(/\/registro$/);
});

let cierresRecibidos = 0;

Before(() => {
  cierresRecibidos = 0;
});

Given('que el servidor cierra correctamente las sesiones', async () => {
  await pagina.route('**/api/auth/logout', (route) => {
    cierresRecibidos++;
    return route.fulfill({ status: 204 });
  });
});

Given('que el servidor no responde al cerrar la sesión', async () => {
  await pagina.route('**/api/auth/logout', (route) => {
    cierresRecibidos++;
    return route.abort();
  });
});

When('abro mi perfil', async () => {
  await pagina.getByRole('button', { name: /^Perfil de / }).click();
  await expect(pagina).toHaveURL(/\/perfil$/);
});

When('confirmo en el diálogo {string}', async (texto: string) => {
  await pagina.getByRole('dialog').getByRole('button', { name: texto }).click();
});

Then('veo el diálogo de confirmación {string}', async (titulo: string) => {
  await expect(pagina.getByRole('dialog')).toContainText(titulo);
});

Then('ya no veo el diálogo de confirmación', async () => {
  await expect(pagina.getByRole('dialog')).toHaveCount(0);
});

Then('el servidor ha recibido {int} petición de cerrar sesión', async (cantidad: number) => {
  expect(cierresRecibidos).toBe(cantidad);
});

Then('mi sesión ya no está guardada en el navegador', async () => {
  expect(await pagina.evaluate(() => localStorage.getItem('travelwrap.sesion'))).toBeNull();
});

Then('mi sesión sigue guardada en el navegador', async () => {
  expect(await pagina.evaluate(() => localStorage.getItem('travelwrap.sesion'))).not.toBeNull();
});

Then('al abrir la pantalla de mi perfil vuelvo al inicio de sesión', async () => {
  await pagina.goto(`${URL_APP}/perfil`);
  await expect(pagina).toHaveURL(/\/login$/);
});
