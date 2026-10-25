import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

type ActividadGuardada = {
  titulo: string;
  fecha: string;
  hora_inicio: string | null;
  ubicacion_nombre: string | null;
};

let guardadas: ActividadGuardada[] = [];
let rechazaPorViajeCerrado = false;

Before(() => {
  guardadas = [];
  rechazaPorViajeCerrado = false;
});

const simularActividades = async () => {
  await paginaActual().route('**/api/viajes/*/actividades', (route) => {
    const peticion = route.request();
    if (peticion.method() !== 'POST') return route.fallback();

    if (rechazaPorViajeCerrado) {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' },
        }),
      });
    }
    const actividad = peticion.postDataJSON() as ActividadGuardada;
    guardadas.push(actividad);
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: `actividad-${guardadas.length}`, ...actividad, orden: guardadas.length - 1 }),
    });
  });
};

Given('que el servidor rechaza las actividades porque el viaje está cerrado', () => {
  rechazaPorViajeCerrado = true;
});

When('abro la pantalla para añadir una actividad al viaje {string}', async (nombre: string) => {
  const id = idDelViaje(nombre);
  expect(id, `el viaje "${nombre}" no está preparado`).toBeDefined();
  await simularActividades();
  await paginaActual().goto(new URL(`/viajes/${id}/actividades/nueva`, paginaActual().url()).toString());
  await expect(paginaActual().getByText('Añadir Actividad', { exact: true })).toBeVisible();
});

When('elijo el día {string}', async (dia: string) => {
  await paginaActual().getByRole('button', { name: dia }).click();
});

When('relleno la actividad con título {string}, lugar {string} y hora {string}', async (titulo: string, lugar: string, hora: string) => {
  await paginaActual().getByLabel('Nombre de la actividad').fill(titulo);
  await paginaActual().getByLabel('Lugar / Dirección').fill(lugar);
  await paginaActual().getByLabel('Hora').fill(hora);
});

Then('el servidor ha guardado la actividad {string} el {string} a las {string} en {string}', (titulo: string, fecha: string, hora: string, lugar: string) => {
  expect(guardadas).toEqual([{ titulo, fecha, hora_inicio: hora, ubicacion_nombre: lugar }]);
});

Then('sigo en la pantalla de añadir actividad', async () => {
  await expect(paginaActual()).toHaveURL(/\/actividades\/nueva$/);
});
