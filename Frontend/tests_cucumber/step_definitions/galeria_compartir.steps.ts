import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { paginaActual } from './login.steps';
import { prepararCaidaDeArchivo, prepararDescarga, descargaEnCurso } from './galeria.steps';

type Compartido = { nombre: string; tipo: string };

const SCRIPT_COMPARTIR = (modo: 'acepta' | 'cancela') => `
  window.compartidos = [];
  Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
  Object.defineProperty(navigator, 'share', {
    value: async (datos) => {
      if (${JSON.stringify(modo)} === 'cancela') throw new DOMException('cancelado', 'AbortError');
      window.compartidos.push({ nombre: datos.files[0].name, tipo: datos.files[0].type });
    },
    configurable: true,
  });
`;

Given('que mi navegador puede compartir archivos', async () => {
  await paginaActual().addInitScript({ content: SCRIPT_COMPARTIR('acepta') });
});

Given('que mi navegador puede compartir archivos pero cancelo el menú', async () => {
  await paginaActual().addInitScript({ content: SCRIPT_COMPARTIR('cancela') });
});

Given('que mi navegador no puede compartir archivos', () => undefined);

Given('que el servidor no entrega el archivo {string}', (nombre: string) => {
  prepararCaidaDeArchivo(nombre);
});

When('pulso compartir en el archivo ampliado', async () => {
  prepararDescarga(paginaActual().waitForEvent('download', { timeout: 2000 }).catch(() => null));
  await paginaActual().getByRole('dialog').getByRole('button', { name: /^Compartir (foto|vídeo)$/ }).click();
});

const compartidos = () =>
  paginaActual().evaluate(() => (window as unknown as { compartidos?: Compartido[] }).compartidos ?? []);

Then('el menú de compartir ha recibido {string} de tipo {string}', async (nombre: string, tipo: string) => {
  await expect.poll(compartidos).toEqual([{ nombre, tipo }]);
});

Then('el menú de compartir no ha recibido nada', async () => {
  await expect(paginaActual().getByRole('button', { name: /^Compartir (foto|vídeo)$/ })).toBeEnabled();
  expect(await compartidos()).toEqual([]);
});

Then('se descarga el archivo {string}', async (nombre: string) => {
  const descarga = await descargaEnCurso();
  expect(descarga, 'no se ha descargado ningún archivo').not.toBeNull();
  expect(descarga?.suggestedFilename()).toBe(nombre);
});

Then('no se descarga ningún archivo', async () => {
  expect(await descargaEnCurso()).toBeNull();
});

Then('no veo el texto {string}', async (texto: string) => {
  await expect(paginaActual().getByText(texto)).toHaveCount(0);
});
