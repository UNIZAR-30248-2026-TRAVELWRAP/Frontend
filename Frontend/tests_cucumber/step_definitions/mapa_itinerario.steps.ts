import { Given, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { sembrarActividad } from './anadir_actividad.steps';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

Given(
  'que el servidor devuelve en {string} la actividad {string} el {string} con ubicación {string} en las coordenadas {float} y {float}',
  (viaje: string, titulo: string, fecha: string, lugar: string, latitud: number, longitud: number) => {
    const id = idDelViaje(viaje);
    expect(id, `el viaje "${viaje}" no está preparado`).toBeDefined();
    sembrarActividad(id as string, titulo, fecha, null, lugar, latitud, longitud);
  },
);

Then('veo el mapa de las actividades del día', async () => {
  await expect(paginaActual().getByRole('region', { name: 'Mapa de las actividades del día' })).toBeVisible();
});

Then('veo {int} marcadores en el mapa', async (cantidad: number) => {
  await expect(paginaActual().locator('.leaflet-marker-icon')).toHaveCount(cantidad);
});

Then('veo el marcador {string}', async (nombre: string) => {
  await expect(paginaActual().getByRole('button', { name: nombre, exact: true })).toBeVisible();
});

Then('veo una línea que une las actividades en el mapa', async () => {
  await expect(paginaActual().locator('.leaflet-overlay-pane path')).toHaveCount(1);
});

Then('no veo ninguna línea en el mapa', async () => {
  await expect(paginaActual().locator('.leaflet-overlay-pane path')).toHaveCount(0);
});
