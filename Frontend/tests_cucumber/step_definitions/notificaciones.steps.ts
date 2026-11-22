// Pasos de los avisos de eventos del viaje (PB-54). Usan la página de login.steps.ts y el viaje simulado de
// gestion_viajes.steps.ts, y un servidor de Socket.io simulado que envía los avisos por /notificaciones
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect, type WebSocketRoute } from '@playwright/test';
import { paginaActual } from './login.steps';
import { idDelViaje } from './gestion_viajes.steps';

const PANTALLAS: Record<string, string> = { gasto: 'gastos', tarea: 'tareas', votacion: 'votaciones', mensaje: 'chat' };

let conexiones: WebSocketRoute[] = [];

Before(() => {
  conexiones = [];
});

Given('que la app recibe avisos en tiempo real', async () => {
  await paginaActual().routeWebSocket(/\/socket\.io\//, (ws) => {
    conexiones.push(ws);
    ws.send(`0${JSON.stringify({ sid: 'cucumber', upgrades: [], pingInterval: 25000, pingTimeout: 60000, maxPayload: 1000000 })}`);
    ws.onMessage((datos) => {
      const conexion = /^40(\/[a-z]+)/.exec(String(datos));
      if (conexion) ws.send(`40${conexion[1]},{"sid":"cucumber${conexion[1]}"}`);
    });
  });
});

When('llega el aviso {string} de tipo {string} en el viaje {string}', async (texto: string, tipo: string, nombre: string) => {
  const aviso = { viaje_id: idDelViaje(nombre), viaje_nombre: nombre, tipo, pantalla: PANTALLAS[tipo], texto };
  // El aviso se repite hasta que la app se ha conectado y lo recibe
  await expect(async () => {
    conexiones.forEach((ws) => ws.send(`42/notificaciones,${JSON.stringify(['notificacion', aviso])}`));
    await expect(paginaActual().getByRole('status')).toBeVisible({ timeout: 500 });
  }).toPass();
});

When('toco el aviso', async () => {
  await paginaActual().getByRole('button', { name: /Abrir$/ }).click();
});

Then('veo el aviso del viaje {string} con el texto {string}', async (nombre: string, texto: string) => {
  const aviso = paginaActual().getByRole('status');
  await expect(aviso).toContainText(nombre);
  await expect(aviso).toContainText(texto);
});

Then('no veo ningún aviso', async () => {
  await expect(paginaActual().getByRole('status')).toHaveCount(0);
});

Then('estoy en la pantalla {string} del viaje {string}', async (pantalla: string, nombre: string) => {
  await expect(paginaActual()).toHaveURL(new URL(`/viajes/${idDelViaje(nombre)}/${pantalla}`, paginaActual().url()).toString());
});
