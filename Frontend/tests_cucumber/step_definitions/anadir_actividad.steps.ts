import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

type ActividadSimulada = {
  id: string;
  viaje_id: string;
  titulo: string;
  fecha: string;
  hora_inicio: string | null;
  ubicacion_nombre: string | null;
};

type DatosActividad = Pick<ActividadSimulada, 'titulo' | 'fecha' | 'hora_inicio' | 'ubicacion_nombre'>;

let actividades: ActividadSimulada[] = [];
let rechazaPorViajeCerrado = false;
let cambiosRecibidos: Partial<DatosActividad>[] = [];
let eliminadas: string[] = [];

Before(() => {
  actividades = [];
  rechazaPorViajeCerrado = false;
  cambiosRecibidos = [];
  eliminadas = [];
});

const idDeLaUrl = (url: string) => new URL(url).pathname.split('/')[3];

const ordenadas = (lista: ActividadSimulada[]) =>
  [...lista].sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      (a.hora_inicio === null ? 1 : 0) - (b.hora_inicio === null ? 1 : 0) ||
      (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''),
  );

export const sembrarActividad = (
  viajeId: string,
  titulo: string,
  fecha: string,
  hora: string | null,
  ubicacion: string | null = null,
) => {
  actividades.push({
    id: `actividad-${actividades.length + 1}`,
    viaje_id: viajeId,
    titulo,
    fecha,
    hora_inicio: hora,
    ubicacion_nombre: ubicacion,
  });
};

export const simularActividades = async () => {
  await paginaActual().route('**/api/viajes/*/actividades/*', (route) => {
    const peticion = route.request();
    const actividadId = new URL(peticion.url()).pathname.split('/').pop();
    if (rechazaPorViajeCerrado) {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' },
        }),
      });
    }
    const actividad = actividades.find((a) => a.id === actividadId);
    if (!actividad) return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });

    if (peticion.method() === 'DELETE') {
      actividades = actividades.filter((a) => a.id !== actividadId);
      eliminadas.push(actividad.titulo);
      return route.fulfill({ status: 204 });
    }
    const cambios = peticion.postDataJSON() as Partial<DatosActividad>;
    cambiosRecibidos.push(cambios);
    Object.assign(actividad, cambios);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(actividad) });
  });
  await paginaActual().route('**/api/viajes/*/actividades', (route) => {
    const peticion = route.request();
    const viajeId = idDeLaUrl(peticion.url());

    if (peticion.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ actividades: ordenadas(actividades.filter((a) => a.viaje_id === viajeId)) }),
      });
    }
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
    const datos = peticion.postDataJSON() as DatosActividad;
    sembrarActividad(viajeId, datos.titulo, datos.fecha, datos.hora_inicio, datos.ubicacion_nombre);
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(actividades[actividades.length - 1]),
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
  const guardadas: DatosActividad[] = actividades.map((a) => ({
    titulo: a.titulo,
    fecha: a.fecha,
    hora_inicio: a.hora_inicio,
    ubicacion_nombre: a.ubicacion_nombre,
  }));
  expect(guardadas).toEqual([{ titulo, fecha, hora_inicio: hora, ubicacion_nombre: lugar }]);
});

When('cambio el nombre de la actividad a {string}', async (titulo: string) => {
  await paginaActual().getByLabel('Nombre de la actividad').fill(titulo);
});

Then('el servidor ha recibido el cambio de título a {string}', (titulo: string) => {
  expect(cambiosRecibidos).toEqual([{ titulo }]);
});

Then('el servidor ha recibido el cambio de día a {string}', (fecha: string) => {
  expect(cambiosRecibidos).toEqual([{ fecha }]);
});

Then('el servidor ha eliminado {int} actividades', (cantidad: number) => {
  expect(eliminadas).toHaveLength(cantidad);
});

Then('el servidor ha eliminado la actividad {string}', (titulo: string) => {
  expect(eliminadas).toEqual([titulo]);
});

Then('estoy en el itinerario del viaje', async () => {
  await expect(paginaActual()).toHaveURL(/\/viajes\/viaje-\d+\/itinerario(\?fecha=[0-9-]+)?$/);
});

Then('sigo en la pantalla de añadir actividad', async () => {
  await expect(paginaActual()).toHaveURL(/\/actividades\/nueva$/);
});
