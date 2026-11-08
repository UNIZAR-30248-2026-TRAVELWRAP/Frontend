// Pasos para unirse a un viaje con el enlace de invitación (PB-15).
// El código QR de la invitación contiene este mismo enlace, así que abrirlo cubre los dos casos.
// Simulan el backend de las invitaciones y la lista de viajes del usuario. Usan la página y el login de login.steps.ts
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect, type Route } from '@playwright/test';
import { paginaActual } from './login.steps';

const YO = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';

type Invitacion = {
  token: string;
  viaje: { id: string; nombre: string; destino: string | null; estado: 'activo' | 'archivado' };
  yaSoyMiembro: boolean;
};

let invitaciones: Invitacion[] = [];
let misViajes: Invitacion['viaje'][] = [];
let unionesRecibidas = 0;
let rutasRegistradas = false;

Before(() => {
  invitaciones = [];
  misViajes = [];
  unionesRecibidas = 0;
  rutasRegistradas = false;
});

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const viajeDeLaLista = (viaje: Invitacion['viaje']) => ({
  ...viaje,
  descripcion: null,
  fecha_inicio: '2027-07-01',
  fecha_fin: '2027-07-07',
  moneda: 'EUR',
  presupuesto: 700,
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: viaje.estado === 'activo' && viaje.destino === null,
  rol: 'miembro',
  miembros: [
    { usuario_id: 'berta', nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: YO, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
});

const simular = async () => {
  if (rutasRegistradas) return;
  rutasRegistradas = true;
  const pagina = paginaActual();

  await pagina.route('**/api/invitaciones/*/unirse', (route) => {
    unionesRecibidas += 1;
    const token = decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-2) ?? '');
    const invitacion = invitaciones.find((i) => i.token === token);
    if (!invitacion) {
      return json(route, 404, { error: { codigo: 'invitacion_no_encontrada', mensaje: 'La invitación no existe' } });
    }
    if (invitacion.viaje.estado !== 'activo') {
      return json(route, 409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está finalizado' } });
    }
    const yaEraMiembro = invitacion.yaSoyMiembro;
    if (!misViajes.includes(invitacion.viaje)) misViajes.push(invitacion.viaje);
    invitacion.yaSoyMiembro = true;
    return json(route, 200, {
      viaje: { id: invitacion.viaje.id, nombre: invitacion.viaje.nombre, destino: invitacion.viaje.destino, imagen_portada_url: null },
      miembro: { rol: 'miembro', unido_en: '2026-11-08T10:00:00Z' },
      ya_era_miembro: yaEraMiembro,
    });
  });

  await pagina.route('**/api/viajes**', (route) => {
    const ruta = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
    const estado = new URL(route.request().url()).searchParams.get('estado');
    if (ruta === '/viajes') {
      return json(route, 200, { viajes: misViajes.filter((v) => !estado || v.estado === estado).map(viajeDeLaLista) });
    }
    const viaje = misViajes.find((v) => ruta === `/viajes/${v.id}`);
    return viaje
      ? json(route, 200, viajeDeLaLista(viaje))
      : json(route, 404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } });
  });
};

const tokenDe = (nombre: string) => `invitacion-${nombre.toLowerCase().replaceAll(' ', '-')}`;

Given('que Berta me ha invitado a su viaje activo {string} con destino {string}', async (nombre: string, destino: string) => {
  invitaciones.push({ token: tokenDe(nombre), viaje: { id: `viaje-${invitaciones.length + 1}`, nombre, destino, estado: 'activo' }, yaSoyMiembro: false });
  await simular();
});

Given('que ya soy miembro del viaje {string} al que me invita Berta', async (nombre: string) => {
  const viaje = { id: `viaje-${invitaciones.length + 1}`, nombre, destino: 'Lisboa', estado: 'activo' as const };
  invitaciones.push({ token: tokenDe(nombre), viaje, yaSoyMiembro: true });
  misViajes.push(viaje);
  await simular();
});

Given('que Berta me ha invitado a su viaje {string}, que ya ha terminado', async (nombre: string) => {
  invitaciones.push({ token: tokenDe(nombre), viaje: { id: `viaje-${invitaciones.length + 1}`, nombre, destino: 'Oporto', estado: 'archivado' }, yaSoyMiembro: false });
  await simular();
});

Given('que nadie ha creado ninguna invitación con el código {string}', async (_token: string) => {
  await simular();
});

const abrirEnlace = async (token: string) => {
  // Sin una página abierta todavía, se parte de la aplicación (la URL base del servidor de pruebas)
  const base = paginaActual().url().startsWith('http') ? paginaActual().url() : 'http://localhost:5174/';
  await paginaActual().goto(new URL(`/unirse/${encodeURIComponent(token)}`, base).toString());
};

When('abro el enlace de invitación del viaje {string}', async (nombre: string) => {
  await abrirEnlace(tokenDe(nombre));
});

When('abro el enlace de invitación con el código {string}', async (token: string) => {
  await abrirEnlace(token);
});

When('inicio sesión con el email {string} y la contraseña {string}', async (email: string, password: string) => {
  await paginaActual().getByLabel('Email').fill(email);
  await paginaActual().getByLabel('Contraseña').fill(password);
  await paginaActual().getByRole('button', { name: 'Iniciar sesión' }).click();
});

Then('veo el título {string}', async (titulo: string) => {
  await expect(paginaActual().getByText(titulo, { exact: true })).toBeVisible();
});

Then('veo el viaje {string} entre mis viajes activos', async (nombre: string) => {
  await expect(paginaActual()).toHaveURL(/\/$/);
  await expect(paginaActual().getByRole('button', { name: new RegExp(nombre) })).toBeVisible();
});

Then('no veo el viaje {string} entre mis viajes', async (nombre: string) => {
  await expect(paginaActual()).toHaveURL(/\/$/);
  await expect(paginaActual().getByRole('button', { name: new RegExp(nombre) })).toHaveCount(0);
});

Then('el servidor ha recibido {int} petición/peticiones para unirse', (cantidad: number) => {
  expect(unionesRecibidas).toBe(cantidad);
});
