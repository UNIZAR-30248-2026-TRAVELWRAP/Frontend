// Pasos de «Mis viajes» (PB-08) y del enlace de invitación (PB-14).
// Simulan el backend de los viajes del usuario y el enlace de invitación de cada uno.
// Usan la página y el login de login.steps.ts
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect, type Route } from '@playwright/test';
import { paginaActual } from './login.steps';

const YO = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const URL_APP = 'http://localhost:5174';

type Estado = 'activo' | 'finalizado' | 'archivado';
type ViajeSimulado = { id: string; nombre: string; destino: string | null; estado: Estado };

let viajes: ViajeSimulado[] = [];
let rutasRegistradas = false;

Before(() => {
  viajes = [];
  rutasRegistradas = false;
});

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const enFormatoApi = (viaje: ViajeSimulado) => ({
  ...viaje,
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 850,
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: viaje.estado === 'activo' && viaje.destino === null,
  rol: 'creador',
  miembros: [
    { usuario_id: YO, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: 'berta', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
});

// Token de invitación permanente y distinto para cada viaje
const tokenDe = (viaje: ViajeSimulado) => `token-${viaje.id}`;
const enlaceDe = (viaje: ViajeSimulado) => `${URL_APP}/unirse/${tokenDe(viaje)}`;

const simular = async () => {
  if (rutasRegistradas) return;
  rutasRegistradas = true;
  await paginaActual().route('**/api/viajes**', (route) => {
    const url = new URL(route.request().url());
    const ruta = url.pathname.replace(/^.*\/api/, '');
    if (ruta === '/viajes') {
      const estado = url.searchParams.get('estado');
      return json(route, 200, { viajes: viajes.filter((v) => !estado || v.estado === estado).map(enFormatoApi) });
    }
    const [, , id, accion] = ruta.split('/');
    const viaje = viajes.find((v) => v.id === id);
    if (!viaje) return json(route, 404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } });
    if (accion === 'invitacion') return json(route, 200, { token: tokenDe(viaje), enlace: enlaceDe(viaje) });
    if (accion) return json(route, 200, accion === 'votaciones' ? { votaciones: [] } : {});
    return json(route, 200, enFormatoApi(viaje));
  });
};

const anadir = async (nombre: string, estado: Estado, destino: string | null) => {
  viajes.push({ id: `viaje-${viajes.length + 1}`, nombre, destino, estado });
  await simular();
};

const elViaje = (nombre: string) => {
  const viaje = viajes.find((v) => v.nombre === nombre);
  expect(viaje, `el viaje "${nombre}" no está preparado`).toBeDefined();
  return viaje as ViajeSimulado;
};

const irA = (ruta: string) => paginaActual().goto(`${URL_APP}${ruta}`);
const tarjeta = (nombre: string) => paginaActual().getByRole('button', { name: new RegExp(nombre) });

// ── Preparación ──────────────────────────────────────────────────────────────

Given('que estoy en el viaje en curso {string} con destino {string}', async (nombre: string, destino: string) => {
  await anadir(nombre, 'activo', destino);
});

Given('que estoy en el viaje {string}, pendiente de votar el destino', async (nombre: string) => {
  await anadir(nombre, 'activo', null);
});

Given('que estuve en el viaje {string}, que ya ha finalizado', async (nombre: string) => {
  await anadir(nombre, 'finalizado', 'Oporto');
});

Given('que archivé el viaje {string}', async (nombre: string) => {
  await anadir(nombre, 'archivado', 'París');
});

Given('que el navegador me deja usar el portapapeles', async () => {
  await paginaActual().context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: URL_APP });
});

// ── Acciones ─────────────────────────────────────────────────────────────────

When('abro mis viajes', async () => {
  await irA('/');
  await expect(paginaActual().getByText(/^Viajes? activos?$/).or(paginaActual().getByText('Viajes anteriores')).first()).toBeVisible();
});

When('pulso el viaje {string}', async (nombre: string) => {
  await tarjeta(nombre).click();
});

When('abro la invitación del viaje {string} desde su inicio', async (nombre: string) => {
  await irA(`/viajes/${elViaje(nombre).id}`);
  await paginaActual().getByRole('button', { name: 'Invitar' }).click();
});

When('intento abrir {string} sin haber iniciado sesión', async (ruta: string) => {
  await irA(ruta);
});

When('amplío el código QR', async () => {
  await paginaActual().getByRole('button', { name: 'Ampliar codigo QR' }).click();
});

// ── Comprobaciones ───────────────────────────────────────────────────────────

Then('veo el viaje {string} entre mis viajes en curso', async (nombre: string) => {
  await expect(tarjeta(nombre)).toBeVisible();
  await expect(tarjeta(nombre)).toContainText('En curso');
});

Then('veo el viaje {string} como pendiente de destino', async (nombre: string) => {
  await expect(tarjeta(nombre)).toContainText('Pendiente de destino');
});

Then('veo el viaje {string} entre mis viajes anteriores', async (nombre: string) => {
  const seccion = paginaActual().getByText('Viajes anteriores', { exact: true });
  await expect(seccion).toBeVisible();
  await expect(tarjeta(nombre)).toBeVisible();
  // La tarjeta está debajo del título «Viajes anteriores»
  const [titulo, viaje] = await Promise.all([seccion.boundingBox(), tarjeta(nombre).boundingBox()]);
  expect(viaje?.y ?? 0).toBeGreaterThan(titulo?.y ?? Number.POSITIVE_INFINITY);
});

Then('no veo el viaje {string} en mis viajes', async (nombre: string) => {
  await expect(tarjeta(nombre)).toHaveCount(0);
});

Then('estoy en el inicio del viaje {string}', async (nombre: string) => {
  await expect(paginaActual()).toHaveURL(new RegExp(`/viajes/${elViaje(nombre).id}$`));
  await expect(paginaActual().getByRole('navigation', { name: 'Secciones del viaje' })).toBeVisible();
});

Then('estoy en el resumen del viaje {string}', async (nombre: string) => {
  await expect(paginaActual()).toHaveURL(new RegExp(`/viajes/${elViaje(nombre).id}/resumen$`));
});

Then('estoy en la votación del destino del viaje {string}', async (nombre: string) => {
  await expect(paginaActual()).toHaveURL(new RegExp(`/viajes/${elViaje(nombre).id}/destino$`));
});

Then('me lleva a la pantalla de inicio de sesión', async () => {
  await expect(paginaActual()).toHaveURL(/\/login$/);
});

Then('veo el enlace de invitación del viaje {string}', async (nombre: string) => {
  await expect(paginaActual().getByText(enlaceDe(elViaje(nombre)), { exact: true })).toBeVisible();
});

Then('el enlace de invitación del viaje {string} está en el portapapeles', async (nombre: string) => {
  const copiado = await paginaActual().evaluate(() => navigator.clipboard.readText());
  expect(copiado).toBe(enlaceDe(elViaje(nombre)));
});

Then('el botón confirma que el enlace se ha copiado', async () => {
  await expect(paginaActual().getByRole('button', { name: 'Enlace copiado' })).toBeVisible();
});

Then('veo el código QR ampliado del viaje', async () => {
  const dialogo = paginaActual().getByRole('dialog', { name: 'Codigo QR del viaje' });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.locator('svg').first()).toBeVisible();
});
