import { expect, type Page } from '@playwright/test';

// Lleva el Wrap a la diapositiva indicada (1 es la primera). En WebKit las teclas pulsadas justo cuando el resumen
// acaba de cargar se pierden, así que se pulsa de una en una y se espera a que la diapositiva cambie, en lugar de
// pulsar a ciegas
export const irADiapositiva = async (page: Page, numero: number) => {
  await expect
    .poll(
      async () => {
        const etiqueta = (await page.getByRole('region').getAttribute('aria-label')) ?? '';
        const posicion = /(\d+) de \d+/.exec(etiqueta);
        const actual = posicion ? Number(posicion[1]) : 0;
        if (actual > 0 && actual < numero) await page.keyboard.press('ArrowRight');
        return actual;
      },
      { timeout: 15000 },
    )
    .toBe(numero);
};
