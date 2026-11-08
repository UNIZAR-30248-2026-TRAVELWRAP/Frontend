import { Given, Then, When } from '@cucumber/cucumber';
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

type RutaSimulada = { distancia: number; duracion: number; ahorro: number; orden: string[] } | null;

let rutaSimulada: RutaSimulada = null;
let peticionesDeRuta = 0;

Given('que el servicio de rutas calcula un recorrido de {int} metros y {int} segundos', async (distancia: number, duracion: number) => {
  rutaSimulada = { distancia, duracion, ahorro: 0, orden: [] };
  await simularRutas();
});

Given('que el servicio de rutas sugiere el orden {string} y ahorra {int} metros', async (orden: string, ahorro: number) => {
  rutaSimulada = { distancia: 2000, duracion: 1500, ahorro, orden: orden.split(',') };
  await simularRutas();
});

Given('que el servicio de rutas no responde', async () => {
  rutaSimulada = null;
  await simularRutas();
});

const simularRutas = async () => {
  peticionesDeRuta = 0;
  await paginaActual().route('**/api/viajes/*/ruta**', (route) => {
    peticionesDeRuta += 1;
    if (!rutaSimulada) {
      return route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: { codigo: 'error_ruta', mensaje: 'No se ha podido calcular la ruta' } }),
      });
    }
    const puntos = [
      { id: 'a1', titulo: 'Visita al Coliseo', latitud: 41.890214, longitud: 12.492231 },
      { id: 'a2', titulo: 'Foro Romano', latitud: 41.892462, longitud: 12.485325 },
    ];
    const ids = rutaSimulada.orden.length > 0 ? rutaSimulada.orden : puntos.map((punto) => punto.id);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        puntos,
        orden_sugerido: ids,
        ahorro_m: rutaSimulada.ahorro,
        ruta: {
          distancia_m: rutaSimulada.distancia,
          duracion_s: rutaSimulada.duracion,
          geometria: [
            [41.89021, 12.49223],
            [41.8911, 12.49],
            [41.89246, 12.48533],
          ],
        },
      }),
    });
  });
};

Then('veo la línea continua de la ruta por calles en el mapa', async () => {
  const linea = paginaActual().locator('.leaflet-overlay-pane path');
  await expect(linea).toHaveCount(1);
  await expect(linea).not.toHaveAttribute('stroke-dasharray', /.+/);
});

Then('veo la línea discontinua recta en el mapa', async () => {
  await expect(paginaActual().locator('.leaflet-overlay-pane path')).toHaveAttribute('stroke-dasharray', '8 8');
});

Then('el servicio de rutas ha recibido {int} petición/peticiones', async (cantidad: number) => {
  await expect.poll(() => peticionesDeRuta).toBe(cantidad);
});

Then('el mapa ocupa casi toda la pantalla', async () => {
  const pagina = paginaActual();
  const altoVentana = pagina.viewportSize()?.height ?? 0;
  const region = pagina.getByRole('region', { name: 'Mapa de las actividades del día' });
  await expect.poll(async () => (await region.boundingBox())?.height ?? 0).toBeGreaterThan(altoVentana * 0.55);
});

Then('el mapa vuelve a su tamaño normal', async () => {
  const region = paginaActual().getByRole('region', { name: 'Mapa de las actividades del día' });
  await expect.poll(async () => (await region.boundingBox())?.height ?? 0).toBeLessThan(260);
});

When('pulso la tecla Escape', async () => {
  await paginaActual().keyboard.press('Escape');
});
