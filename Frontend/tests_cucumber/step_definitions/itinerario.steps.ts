import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { sembrarActividad, simularActividades } from './anadir_actividad.steps';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

const agenda = () => paginaActual().getByRole('list', { name: 'Agenda del día' }).getByRole('listitem');

Given('que el servidor devuelve en {string} la actividad {string} el {string} a las {string}', (viaje: string, titulo: string, fecha: string, hora: string) => {
  const id = idDelViaje(viaje);
  expect(id, `el viaje "${viaje}" no está preparado`).toBeDefined();
  sembrarActividad(id as string, titulo, fecha, hora);
});

When('abro el itinerario del viaje {string}', async (nombre: string) => {
  const id = idDelViaje(nombre);
  expect(id, `el viaje "${nombre}" no está preparado`).toBeDefined();
  await simularActividades();
  await paginaActual().goto(new URL(`/viajes/${id}/itinerario`, paginaActual().url()).toString());
  await expect(paginaActual().getByText('Agenda del día', { exact: true })).toBeVisible();
});

Then('veo en la agenda, por este orden, {string} y {string}', async (primera: string, segunda: string) => {
  await expect(agenda()).toHaveText([new RegExp(`^${primera}`), new RegExp(`^${segunda}`)]);
});

Then('veo en la agenda, por este orden, {string}', async (titulo: string) => {
  await expect(agenda()).toHaveText([new RegExp(`^${titulo}`)]);
});

Then('no veo en la agenda la actividad {string}', async (titulo: string) => {
  await expect(paginaActual().getByText(titulo)).toHaveCount(0);
});

let manejadorSinConexion: Parameters<ReturnType<typeof paginaActual>['route']>[1] | null = null;

When('se corta la conexión con el servidor', async () => {
  manejadorSinConexion = (route) => route.abort('internetdisconnected');
  await paginaActual().route('**/api/**', manejadorSinConexion);
});

When('vuelve la conexión con el servidor', async () => {
  if (manejadorSinConexion) await paginaActual().unroute('**/api/**', manejadorSinConexion);
  manejadorSinConexion = null;
  await paginaActual().evaluate(() => window.dispatchEvent(new Event('online')));
});

Then('veo el botón {string}', async (texto: string) => {
  await expect(paginaActual().getByRole('button', { name: texto })).toBeVisible();
});
