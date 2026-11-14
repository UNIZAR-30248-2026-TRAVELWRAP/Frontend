// Pasos de «Mi Perfil»: cambiar el nombre y la foto (PB-36). Simulan los endpoints de /perfil y la foto del
// bucket público. Usan la página y el login de login.steps.ts y reutilizan sus pasos de abrir el perfil, botones,
// mensajes de error y diálogos de confirmación
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { paginaActual } from './login.steps';

type Usuario = { id: string; nombre: string | null; email: string; avatar_url: string | null; creado_en: string };

const FOTO = 'https://proyecto.supabase.co/storage/v1/object/public/avatares/df77cba6-4be5-4cbc-814b-1e228dd73dcc/0a1b2c3d.jpg';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// Backend de /perfil en memoria para cada escenario
let usuario: Usuario | null = null;
let nombresGuardados: string[] = [];
let fotosRecibidas = 0;
let fotosQuitadas = 0;

Before(() => {
  usuario = null;
  nombresGuardados = [];
  fotosRecibidas = 0;
  fotosQuitadas = 0;
});

const responder = (cuerpo: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(cuerpo),
});

const foto = () => paginaActual().getByRole('button', { name: 'Cambiar foto de perfil' }).locator('img');
const campoNombre = () => paginaActual().getByRole('textbox', { name: 'Nombre' });

// ── Preparación ──────────────────────────────────────────────────────────────

Given('que el servidor guarda los cambios de mi perfil', async () => {
  const pagina = paginaActual();
  // Se parte de la sesión que dejó el login
  const guardada = await pagina.evaluate(() => JSON.parse(localStorage.getItem('travelwrap.sesion') ?? 'null'));
  usuario = guardada.usuario as Usuario;

  await pagina.route('**/api/perfil**', (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    const metodo = peticion.method();
    if (!usuario) return route.fulfill(responder({ error: { codigo: 'sin_sesion', mensaje: 'Sin sesión' } }, 401));

    if (ruta === '/perfil' && metodo === 'PATCH') {
      const { nombre } = peticion.postDataJSON();
      nombresGuardados.push(nombre);
      usuario = { ...usuario, nombre };
      return route.fulfill(responder({ usuario }));
    }
    if (ruta === '/perfil/avatar' && metodo === 'PUT') {
      fotosRecibidas += 1;
      usuario = { ...usuario, avatar_url: FOTO };
      return route.fulfill(responder({ usuario }));
    }
    if (ruta === '/perfil/avatar' && metodo === 'DELETE') {
      fotosQuitadas += 1;
      usuario = { ...usuario, avatar_url: null };
      return route.fulfill(responder({ usuario }));
    }
    return route.fulfill(responder({ error: { codigo: 'no_encontrado', mensaje: 'No existe' } }, 404));
  });
  // La foto del bucket público de Supabase
  await pagina.route('https://proyecto.supabase.co/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }),
  );
});

// ── Acciones ─────────────────────────────────────────────────────────────────

When('escribo el nombre {string}', async (nombre: string) => {
  await paginaActual().getByRole('button', { name: 'Editar nombre' }).click();
  await campoNombre().fill(nombre);
});

When('cambio mi nombre a {string}', async (nombre: string) => {
  await paginaActual().getByRole('button', { name: 'Editar nombre' }).click();
  await campoNombre().fill(nombre);
  await paginaActual().getByRole('button', { name: 'Guardar' }).click();
});

When('elijo la foto {string} de tipo {string}', async (nombre: string, tipo: string) => {
  await paginaActual().getByLabel('Elegir foto de perfil').setInputFiles({ name: nombre, mimeType: tipo, buffer: PNG_1X1 });
});

// ── Comprobaciones ───────────────────────────────────────────────────────────

Then('el servidor ha guardado el nombre {string}', (nombre: string) => {
  expect(nombresGuardados).toEqual([nombre]);
});

Then('el servidor no ha recibido ningún cambio del perfil', () => {
  expect(nombresGuardados).toHaveLength(0);
  expect(fotosRecibidas).toBe(0);
  expect(fotosQuitadas).toBe(0);
});

Then('el servidor ha recibido {int} foto(s) de perfil', (cantidad: number) => {
  expect(fotosRecibidas).toBe(cantidad);
});

Then('el servidor ha quitado la foto de perfil', () => {
  expect(fotosQuitadas).toBe(1);
});

Then('veo mi foto de perfil', async () => {
  await expect(foto()).toHaveAttribute('src', FOTO);
});

Then('no veo mi foto de perfil', async () => {
  await expect(foto()).toHaveCount(0);
});

Then('veo mi inicial {string}', async (inicial: string) => {
  await expect(paginaActual().getByRole('button', { name: 'Cambiar foto de perfil' })).toContainText(inicial);
});
