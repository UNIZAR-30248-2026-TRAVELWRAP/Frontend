import { Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { paginaActual } from './login.steps';

When('abro el formulario de nuevo viaje', async () => {
  await paginaActual().getByRole('button', { name: 'Crear nuevo viaje' }).click();
  await expect(paginaActual()).toHaveURL(/\/viajes\/nuevo$/);
});

When('indico el destino {string} con las fechas del {string} al {string}', async (destino: string, inicio: string, fin: string) => {
  await paginaActual().getByPlaceholder('Ciudad o país').fill(destino);
  await paginaActual().getByLabel('Fecha inicio').fill(inicio);
  await paginaActual().getByLabel('Fecha fin').fill(fin);
});

When('indico el presupuesto {string}', async (presupuesto: string) => {
  await paginaActual().getByLabel('Presupuesto estimado (€)').fill(presupuesto);
});

Then('el nombre del viaje es {string}', async (nombre: string) => {
  await expect(paginaActual().getByLabel('Nombre del viaje')).toHaveValue(nombre);
});
