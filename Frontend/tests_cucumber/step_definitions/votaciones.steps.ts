// Pasos de las votaciones de un viaje.
// Usan la página que prepara login.steps.ts, el viaje de gestion_viajes.steps.ts y sus pasos de botones y mensajes
import { Before, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';

type OpcionRecibida = { texto: string; valor_fecha: string | null };
type VotacionRecibida = { titulo: string; tipo: string; opciones: OpcionRecibida[] };

// Votaciones guardadas en el backend simulado de cada escenario, en el formato de la API
let votaciones: Record<string, unknown>[] = [];
let recibidas: VotacionRecibida[] = [];

Before(() => {
  votaciones = [];
  recibidas = [];
});

const nuevaVotacion = (datos: VotacionRecibida) => ({
  id: `votacion-${votaciones.length + 1}`,
  titulo: datos.titulo,
  descripcion: null,
  tipo: datos.tipo,
  estado: 'abierta',
  opcion_ganadora_id: null,
  creado_por: USUARIO_ID,
  creado_en: '2026-10-27T10:00:00Z',
  cerrada_en: null,
  opciones: datos.opciones.map((o, i) => ({ id: `opcion-${i + 1}`, ...o, orden: i, votos: 0, votantes: [] })),
  total_votos: 0,
  total_miembros: 1,
  todos_han_votado: false,
  mi_voto: null,
});

const simularVotaciones = async () => {
  await paginaActual().route('**/api/viajes/*/votaciones', (route) => {
    const peticion = route.request();
    if (peticion.method() === 'POST') {
      const datos = peticion.postDataJSON() as VotacionRecibida;
      recibidas.push(datos);
      // La más reciente va la primera, como en la API
      votaciones.unshift(nuevaVotacion(datos));
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(votaciones[0]) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ votaciones }) });
  });
};

When('abro las votaciones del viaje {string}', async (nombre: string) => {
  const id = idDelViaje(nombre);
  expect(id, `el viaje "${nombre}" no está preparado`).toBeDefined();
  await simularVotaciones();
  await paginaActual().goto(new URL(`/viajes/${id}/votaciones`, paginaActual().url()).toString());
  await expect(paginaActual().getByRole('button', { name: 'Crear nueva votación' })).toBeVisible();
});

When('elijo el tipo de votación {string}', async (tipo: string) => {
  await paginaActual().getByRole('radio', { name: tipo }).click();
});

When('escribo la pregunta {string}', async (pregunta: string) => {
  await paginaActual().getByLabel('Pregunta de la votación').fill(pregunta);
});

When('escribo las opciones {string} y {string}', async (primera: string, segunda: string) => {
  await paginaActual().getByLabel('Opción A', { exact: true }).fill(primera);
  await paginaActual().getByLabel('Opción B', { exact: true }).fill(segunda);
});

When('escribo {string} en la opción {string}', async (texto: string, letra: string) => {
  await paginaActual().getByLabel(`Opción ${letra}`, { exact: true }).fill(texto);
});

Then('estoy en las votaciones del viaje', async () => {
  await expect(paginaActual()).toHaveURL(/\/viajes\/[^/]+\/votaciones$/);
});

Then('veo la votación {string} con las opciones {string} y {string}', async (titulo: string, primera: string, segunda: string) => {
  const votacion = paginaActual().getByRole('region', { name: titulo });
  await expect(votacion.getByRole('radio', { name: new RegExp(primera) })).toBeVisible();
  await expect(votacion.getByRole('radio', { name: new RegExp(segunda) })).toBeVisible();
});

Then('el servidor ha recibido la votación {string} de tipo {string} con {int} opciones', (titulo: string, tipo: string, cantidad: number) => {
  const votacion = recibidas.find((v) => v.titulo === titulo);
  expect(votacion, `no se ha recibido la votación "${titulo}"`).toBeDefined();
  expect(votacion?.tipo).toBe(tipo);
  expect(votacion?.opciones).toHaveLength(cantidad);
});

Then('el servidor no ha recibido ninguna votación', () => {
  expect(recibidas).toHaveLength(0);
});
