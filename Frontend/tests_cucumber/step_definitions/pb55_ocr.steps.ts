// Pasos del escaneo de documentos con OCR (PB-55). Reutilizan el login, el viaje y la cartera de los demás features.
// El OCR y el guardado del resumen se simulan en el servidor de pruebas: aquí se comprueba lo que ve la persona
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { paginaActual } from './login.steps';

// Lo que el escáner «lee» en cada escenario y los resúmenes que la app guarda
let resultadoEscaneo: unknown = null;
let resumenesGuardados: string[] = [];
let escaneoRegistrado = false;

Before(() => {
  resultadoEscaneo = null;
  resumenesGuardados = [];
  escaneoRegistrado = false;
});

// Respuestas del escaneo y del resumen, registradas una sola vez por escenario
const registrarEscaneo = async () => {
  if (escaneoRegistrado) return;
  escaneoRegistrado = true;
  await paginaActual().route('**/api/viajes/*/gastos/escaneo', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(resultadoEscaneo) }),
  );
  await paginaActual().route('**/api/viajes/*/documentos/texto', (route) => {
    const { texto } = route.request().postDataJSON() as { texto: string };
    resumenesGuardados.push(texto);
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'resumen-1',
        viaje_id: 'roma',
        nombre: 'Resumen escaneado.txt',
        tipo_mime: 'text/plain',
        tamano_bytes: texto.length,
        subido_por: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
        creado_en: '2026-11-22T10:00:00Z',
      }),
    });
  });
};

// Valores de los campos de texto de la pantalla que se está viendo
const valoresDeCampos = () =>
  paginaActual()
    .locator('input')
    .evaluateAll((campos) => campos.map((campo) => (campo as HTMLInputElement).value));

Given('que el escáner lee un ticket con el concepto {string} y el importe {string}', (concepto: string, importe: string) => {
  resultadoEscaneo = { tipo: 'gasto', datos: { concepto, importe: Number(importe.replace(',', '.')) } };
});

Given(
  'que el escáner reconoce una reserva con el título {string} para el {string} a las {string}',
  (titulo: string, fecha: string, hora: string) => {
    resultadoEscaneo = { tipo: 'actividad', datos: { titulo, fecha, hora_inicio: hora } };
  },
);

Given('que el escáner no reconoce el tipo del documento y lee el texto {string}', (texto: string) => {
  resultadoEscaneo = { tipo: 'otro', datos: { resumen: texto } };
});

When('escaneo una foto con el botón «Escanear con OCR»', async () => {
  await registrarEscaneo();
  await paginaActual().getByRole('button', { name: 'Escanear con OCR' }).click();
  await paginaActual()
    .locator('input[type="file"][aria-label="Foto del documento"]')
    .setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0]) });
});

Then('estoy en la pantalla para añadir un gasto', async () => {
  await expect.poll(() => paginaActual().url()).toMatch(/\/gastos\/nuevo$/);
});

Then('estoy en la pantalla para añadir una actividad', async () => {
  await expect.poll(() => paginaActual().url()).toMatch(/\/actividades\/nueva$/);
});

Then('veo en el formulario el importe {string} y el concepto {string}', async (importe: string, concepto: string) => {
  await expect.poll(valoresDeCampos).toEqual(expect.arrayContaining([importe, concepto]));
});

Then('veo en el formulario el título {string} y la hora {string}', async (titulo: string, hora: string) => {
  await expect.poll(valoresDeCampos).toEqual(expect.arrayContaining([titulo, hora]));
});

Then('se ha guardado el resumen {string} en la cartera', async (texto: string) => {
  await expect.poll(() => resumenesGuardados).toContain(texto);
  await expect(paginaActual().getByText('«Resumen escaneado.txt» se ha guardado en la cartera')).toBeVisible();
});
