// Pasos de los gastos compartidos de un viaje.

// Usan la página que prepara login.steps.ts y los viajes de gestion_viajes.steps.ts, y reutilizan sus pasos
// de botones y mensajes de error
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

// Mismos miembros que «que soy miembro, pero no creador, del viaje activo»
const ID_DE = { Berta: 'otro', Adriana: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc' } as Record<string, string>;

type GastoRecibido = {
  concepto: string;
  importe: number;
  categoria: string;
  pagado_por: string;
  participantes: string[];
};

// Gastos que ha recibido el backend simulado en cada escenario
let gastos: GastoRecibido[] = [];
let rechazaPorViajeCerrado = false;

Before(() => {
  gastos = [];
  rechazaPorViajeCerrado = false;
});

// Se registra después de la ruta de viajes, así que tiene prioridad para POST /viajes/:id/gastos
const simularGastos = async () => {
  await paginaActual().route('**/api/viajes/*/gastos', (route) => {
    if (rechazaPorViajeCerrado) {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' },
        }),
      });
    }
    const gasto = route.request().postDataJSON() as GastoRecibido;
    gastos.push(gasto);
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: `gasto-${gastos.length}`, ...gasto, repartos: [] }),
    });
  });
};

// Fila de un miembro en «Dividir entre»
const filaDelReparto = (nombre: string) =>
  paginaActual().locator('label').filter({ has: paginaActual().getByLabel(`Dividir con ${nombre}`) });

Given('que el servidor rechaza los gastos porque el viaje está cerrado', () => {
  rechazaPorViajeCerrado = true;
});

When('abro la pantalla para añadir un gasto al viaje {string}', async (nombre: string) => {
  const id = idDelViaje(nombre);
  expect(id, `el viaje "${nombre}" no está preparado`).toBeDefined();
  await simularGastos();
  await paginaActual().goto(new URL(`/viajes/${id}/gastos/nuevo`, paginaActual().url()).toString());
  await expect(paginaActual().getByText('Añadir Gasto', { exact: true })).toBeVisible();
  await expect(paginaActual().getByRole('radiogroup', { name: 'Quién pagó' })).toBeVisible();
});

When('relleno el gasto con importe {string} y concepto {string}', async (importe: string, concepto: string) => {
  await paginaActual().getByLabel('Importe').fill(importe);
  await paginaActual().getByLabel('Concepto').fill(concepto);
});

When('elijo que ha pagado {string}', async (nombre: string) => {
  await paginaActual().getByRole('radio', { name: nombre }).click();
});

When('quito del reparto a {string}', async (nombre: string) => {
  await paginaActual().getByLabel(`Dividir con ${nombre}`).uncheck();
});

Then('la parte de {string} es {string}', async (nombre: string, parte: string) => {
  await expect(filaDelReparto(nombre).getByText(/€$/)).toHaveText(parte);
});

Then('sigo en la pantalla de añadir gasto', async () => {
  await expect(paginaActual()).toHaveURL(/\/gastos\/nuevo$/);
});

Then(
  'el servidor ha guardado el gasto {string} de {float} pagado por {string} entre {string}',
  (concepto: string, importe: number, pagador: string, participantes: string) => {
    expect(gastos).toEqual([
      {
        concepto,
        importe,
        categoria: 'comida',
        pagado_por: ID_DE[pagador],
        participantes: participantes.split(', ').map((nombre) => ID_DE[nombre]),
      },
    ]);
  },
);

Then('el servidor no ha guardado ningún gasto', () => {
  expect(gastos).toEqual([]);
});
