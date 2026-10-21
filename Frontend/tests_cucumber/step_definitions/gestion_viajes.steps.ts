// Pasos de la gestión de un viaje desde su inicio.
// Usan la página que prepara login.steps.ts y reutilizan sus pasos de botones y diálogos
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { paginaActual } from './login.steps';

const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';

type Viaje = Record<string, unknown> & { id: string; nombre: string; estado: string };

// Backend de viajes simulado en memoria para cada escenario
let viajes: Viaje[] = [];
let archivados = 0;
let eliminados: string[] = [];
let fallaEliminar = false;
let rutaRegistrada = false;

Before(() => {
  viajes = [];
  archivados = 0;
  eliminados = [];
  fallaEliminar = false;
  rutaRegistrada = false;
});

const nuevoViaje = (nombre: string, datos: Record<string, unknown> = {}): Viaje => ({
  id: `viaje-${viajes.length + 1}`,
  nombre,
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 850,
  estado: 'activo',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'creador',
  miembros: [{ usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'creador' }],
  ...datos,
});

const responder = (cuerpo: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: cuerpo === undefined ? '' : JSON.stringify(cuerpo),
});

const simularBackend = async () => {
  if (rutaRegistrada) return;
  rutaRegistrada = true;
  await paginaActual().route('**/api/viajes**', (route) => {
    const peticion = route.request();
    const url = new URL(peticion.url());
    const ruta = url.pathname.replace(/^.*\/api/, '');
    const metodo = peticion.method();

    if (ruta === '/viajes' && metodo === 'GET') {
      const estado = url.searchParams.get('estado');
      return route.fulfill(responder({ viajes: viajes.filter((v) => !estado || v.estado === estado) }));
    }

    const [, , id, accion] = ruta.split('/');
    const viaje = viajes.find((v) => v.id === id);
    if (!viaje) {
      return route.fulfill(
        responder({ error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } }, 404),
      );
    }
    if (accion === 'archivar' && metodo === 'POST') {
      archivados += 1;
      viaje.estado = 'archivado';
      return route.fulfill(responder(viaje));
    }
    if (!accion && metodo === 'PATCH') {
      Object.assign(viaje, peticion.postDataJSON());
      return route.fulfill(responder(viaje));
    }
    if (!accion && metodo === 'DELETE') {
      if (fallaEliminar) {
        return route.fulfill(
          responder({ error: { codigo: 'error_viaje', mensaje: 'No se ha podido eliminar el viaje' } }, 502),
        );
      }
      eliminados.push(viaje.nombre);
      viajes = viajes.filter((v) => v !== viaje);
      return route.fulfill({ status: 204 });
    }
    return route.fulfill(responder(viaje));
  });
};

const irA = (ruta: string) => paginaActual().goto(new URL(ruta, paginaActual().url()).toString());

Given('que tengo el viaje activo {string} con destino {string} y presupuesto {int}', async (nombre: string, destino: string, presupuesto: number) => {
  viajes.push(nuevoViaje(nombre, { destino, presupuesto }));
  await simularBackend();
});

Given('que tengo el viaje archivado {string}', async (nombre: string) => {
  viajes.push(nuevoViaje(nombre, { estado: 'archivado' }));
  await simularBackend();
});

Given('que soy miembro, pero no creador, del viaje activo {string}', async (nombre: string) => {
  viajes.push(
    nuevoViaje(nombre, {
      rol: 'miembro',
      miembros: [
        { usuario_id: 'otro', nombre: 'Berta', avatar_url: null, rol: 'creador' },
        { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
      ],
    }),
  );
  await simularBackend();
});

Given('que el servidor no puede eliminar viajes', () => {
  fallaEliminar = true;
});

When('abro el viaje {string} desde mis viajes', async (nombre: string) => {
  await irA('/');
  // La tarjeta empieza por su etiqueta («En curso», «Pendiente de destino»...), no por el nombre
  await paginaActual().getByRole('button', { name: new RegExp(nombre) }).click();
  await expect(paginaActual()).toHaveURL(/\/viajes\/[^/]+$/);
});

When('abro el viaje archivado {string}', async (nombre: string) => {
  await paginaActual().getByRole('button', { name: new RegExp(`^${nombre}`) }).click();
});

When('cambio el nombre a {string} y el presupuesto a {string}', async (nombre: string, presupuesto: string) => {
  await paginaActual().getByLabel('Nombre del viaje').fill(nombre);
  await paginaActual().getByLabel('Presupuesto total (€)').fill(presupuesto);
});

When('pongo como fecha de fin {string}', async (fecha: string) => {
  await paginaActual().getByLabel('Fecha de fin').fill(fecha);
});

Then('estoy en el inicio del viaje', async () => {
  await expect(paginaActual()).toHaveURL(/\/viajes\/viaje-\d+$/);
  await expect(paginaActual().getByRole('navigation', { name: 'Secciones del viaje' })).toBeVisible();
});

Then('estoy en la pantalla de viajes archivados', async () => {
  await expect(paginaActual()).toHaveURL(/\/viajes\/archivados$/);
});

Then('veo el texto {string}', async (texto: string) => {
  await expect(paginaActual().getByText(texto).first()).toBeVisible();
});

Then('no veo el botón {string}', async (texto: string) => {
  await expect(paginaActual().getByRole('button', { name: texto })).toHaveCount(0);
});

Then('veo el viaje archivado {string}', async (nombre: string) => {
  await expect(paginaActual().getByRole('button', { name: new RegExp(`^${nombre}`) })).toBeVisible();
});

Then('ya no veo el viaje archivado {string}', async (nombre: string) => {
  await expect(paginaActual().getByRole('button', { name: new RegExp(`^${nombre}`) })).toHaveCount(0);
});

Then('el servidor ha archivado {int} viaje', (cantidad: number) => {
  expect(archivados).toBe(cantidad);
});

Then('el servidor ha eliminado el viaje {string}', (nombre: string) => {
  expect(eliminados).toEqual([nombre]);
});
