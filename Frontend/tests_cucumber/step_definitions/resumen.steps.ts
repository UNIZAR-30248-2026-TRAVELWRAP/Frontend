import { readFileSync } from 'node:fs';
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect, type Download } from '@playwright/test';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

type DatosDelResumen = { actividad: string | null; alma: string | null; fotos: boolean };

let datos: DatosDelResumen | null = null;
let fotosRotas = false;
let descargas = 0;
let ultimaDescarga: Download | null = null;
let escuchando = false;

Before(() => {
  datos = null;
  fotosRotas = false;
  descargas = 0;
  ultimaDescarga = null;
  escuchando = false;
});

const json = (status: number, cuerpo: unknown) => ({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const simularResumen = async (viajeId: string, { actividad, alma, fotos }: DatosDelResumen) => {
  const idAlma = alma === 'Berta' ? 'otro' : 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
  await paginaActual().route(`**/api/viajes/${viajeId}/resumen`, (route) =>
    route.fulfill(
      json(200, {
        dias: 4,
        actividad_mas_votada: actividad ? { titulo: actividad, votos: 3 } : null,
        alma_del_grupo: alma ? { usuario_id: idAlma, nombre: alma, pagos: 2, planes_propuestos: 4, fotos_subidas: 1 } : null,
      }),
    ),
  );
  const foto = {
    id: 'f1',
    viaje_id: viajeId,
    nombre: 'coliseo.jpg',
    tipo_mime: 'image/jpeg',
    tamano_bytes: 1,
    subido_por: 'otro',
    creado_en: '2027-05-12T10:00:00Z',
    url: 'https://storage.test/coliseo.jpg',
  };
  await paginaActual().route(`**/api/viajes/${viajeId}/fotos`, (route) => route.fulfill(json(200, { fotos: fotos ? [foto] : [] })));
  await paginaActual().route('https://storage.test/**', (route) =>
    fotosRotas
      ? route.fulfill({ status: 403, body: 'denegado' })
      : route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1, headers: { 'access-control-allow-origin': '*' } }),
  );
};

Given(
  'que el resumen del viaje {string} tiene el Coliseo como actividad más votada y a Berta como alma del grupo',
  (_viaje: string) => {
    datos = { actividad: 'Coliseo', alma: 'Berta', fotos: true };
  },
);

Given('que el resumen del viaje {string} no tiene votos, ni alma del grupo, ni fotos', (_viaje: string) => {
  datos = { actividad: null, alma: null, fotos: false };
});

Given('que las fotos del resumen del viaje {string} no se pueden cargar', (_viaje: string) => {
  fotosRotas = true;
});

When('abro el resumen del viaje {string}', async (viaje: string) => {
  const id = idDelViaje(viaje);
  expect(id, `el viaje "${viaje}" no está preparado`).toBeDefined();
  expect(datos, 'faltan los datos del resumen').not.toBeNull();
  await paginaActual().emulateMedia({ reducedMotion: 'reduce' });
  await simularResumen(id as string, datos as DatosDelResumen);
  paginaActual().on('download', () => {
    descargas++;
  });
  escuchando = true;
  await paginaActual().goto(new URL(`/viajes/${id}/resumen`, paginaActual().url()).toString());
  await expect(paginaActual().getByRole('heading', { name: 'Roma' })).toBeVisible();
});

const tocarLaDerecha = async () => {
  const caja = await paginaActual().getByRole('region').boundingBox();
  await paginaActual().mouse.click((caja?.x ?? 0) + (caja?.width ?? 0) * 0.85, (caja?.y ?? 0) + (caja?.height ?? 0) / 2);
};

When('paso a la diapositiva siguiente', async () => {
  await tocarLaDerecha();
});

When('paso a la última diapositiva', async () => {
  for (let i = 0; i < 5; i++) await tocarLaDerecha();
});

Then('veo la diapositiva {string}', async (titulo: string) => {
  await expect(paginaActual().getByRole('region')).toHaveAccessibleName(new RegExp(`: ${titulo}$`));
});

When('pulso «Descargar imagen»', async () => {
  const boton = paginaActual().getByRole('button', { name: 'Descargar imagen' });
  if (fotosRotas) {
    await boton.click();
    return;
  }
  const descarga = paginaActual().waitForEvent('download');
  await boton.click();
  ultimaDescarga = await descarga;
});

Then('se descarga la imagen {string} de {int} píxeles de ancho', async (nombre: string, ancho: number) => {
  expect(ultimaDescarga, 'no se ha descargado nada').not.toBeNull();
  const archivo = ultimaDescarga as Download;
  expect(archivo.suggestedFilename()).toBe(nombre);
  const bytes = readFileSync(await archivo.path());
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.readUInt32BE(16)).toBe(ancho);
});

Then('no se ha descargado ninguna imagen', async () => {
  expect(escuchando).toBe(true);
  expect(descargas).toBe(0);
});

Then('estoy en mis viajes', async () => {
  await expect(paginaActual()).toHaveURL(/\/$/);
});
