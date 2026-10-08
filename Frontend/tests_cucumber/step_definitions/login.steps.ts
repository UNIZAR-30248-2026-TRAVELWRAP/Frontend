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

Given('que estoy en la pantalla de inicio de sesión', async () => {
  await pagina.goto(`${URL_APP}/login`);
  await expect(pagina.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
});

Given('que he iniciado sesión con el email {string} y la contraseña {string}', async (email: string, password: string) => {
  await pagina.goto(`${URL_APP}/login`);
  await pagina.getByLabel('Email').fill(email);
  await pagina.getByLabel('Contraseña').fill(password);
  await pagina.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(pagina.getByText(`Sesión iniciada como ${email}`)).toBeVisible();
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
  await expect(pagina.getByText(`Sesión iniciada como ${email}`)).toBeVisible();
  await expect(pagina).not.toHaveURL(/\/login$/);
});

Then('veo el mensaje de error {string}', async (mensaje: string) => {
  await expect(pagina.getByRole('alert')).toHaveText(mensaje);
});

Then('sigo en la pantalla de inicio de sesión', async () => {
  await expect(pagina).toHaveURL(/\/login$/);
});
