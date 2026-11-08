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

When('pulso editar la actividad {string}', async (titulo: string) => {
  await paginaActual().getByRole('button', { name: `Editar ${titulo}`, exact: true }).click();
});

When('pulso eliminar la actividad {string}', async (titulo: string) => {
  await paginaActual().getByRole('button', { name: `Eliminar ${titulo}`, exact: true }).click();
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

Then('veo en la agenda, por este orden, {string}, {string} y {string}', async (a: string, b: string, c: string) => {
  await expect(agenda()).toHaveText([a, b, c].map((titulo) => new RegExp(`^${titulo}`)));
});

Then('veo en la agenda, por este orden, {string}, {string}, {string} y {string}', async (a: string, b: string, c: string, d: string) => {
  await expect(agenda()).toHaveText([a, b, c, d].map((titulo) => new RegExp(`^${titulo}`)));
});

Given('que el servidor devuelve en {string} la actividad {string} el {string} sin hora', (viaje: string, titulo: string, fecha: string) => {
  const id = idDelViaje(viaje);
  expect(id, `el viaje "${viaje}" no está preparado`).toBeDefined();
  sembrarActividad(id as string, titulo, fecha, null);
});

const asaDe = (titulo: string) => paginaActual().getByRole('button', { name: `Mover ${titulo}`, exact: true });

Then('puedo mover la actividad {string}', async (titulo: string) => {
  await expect(asaDe(titulo)).toBeVisible();
});

Then('no puedo mover la actividad {string}', async (titulo: string) => {
  await expect(asaDe(titulo)).toHaveCount(0);
});

When('arrastro la actividad {string} sobre la actividad {string}', async (origen: string, destino: string) => {
  const pagina = paginaActual();
  await pagina.setViewportSize({ width: 500, height: 1400 });
  await asaDe(origen).scrollIntoViewIfNeeded();
  const a = await asaDe(origen).boundingBox();
  const b = await agenda().filter({ hasText: destino }).first().boundingBox();
  if (!a || !b) throw new Error('No se encuentran el origen o el destino del arrastre');
  await pagina.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await pagina.mouse.down();
  await pagina.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 12, { steps: 4 });
  await pagina.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 });
  await pagina.mouse.up();
});

When('muevo con el teclado la actividad {string} una posición hacia abajo', async (titulo: string) => {
  const pagina = paginaActual();
  await asaDe(titulo).focus();
  await pagina.keyboard.press('Space');
  await pagina.waitForTimeout(150);
  await pagina.keyboard.press('ArrowDown');
  await pagina.waitForTimeout(150);
  await pagina.keyboard.press('Space');
});
