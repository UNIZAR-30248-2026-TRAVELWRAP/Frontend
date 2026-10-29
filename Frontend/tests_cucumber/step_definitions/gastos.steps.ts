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

type GastoGuardado = GastoRecibido & { fecha: string };

// Gastos que ha recibido el backend simulado en cada escenario
let gastos: GastoRecibido[] = [];
// Gastos que ya tenía el viaje al empezar el escenario
let previos: GastoGuardado[] = [];
let rechazaPorViajeCerrado = false;

Before(() => {
  gastos = [];
  previos = [];
  rechazaPorViajeCerrado = false;
});

// Fecha de los gastos registrados en el escenario: posterior a la de los previos, así que salen primero
const FECHA_NUEVOS = '2027-05-15';

// Historial como lo devuelve el backend: del más reciente al más antiguo, con el total sumado en céntimos
const historial = () => {
  const nuevos = gastos.map((gasto) => ({ ...gasto, fecha: FECHA_NUEVOS })).reverse();
  const anteriores = [...previos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const lista = [...nuevos, ...anteriores].map((gasto, i) => ({ id: `gasto-${i + 1}`, ...gasto, repartos: [] }));
  const total = lista.reduce((suma, gasto) => suma + Math.round(gasto.importe * 100), 0) / 100;
  return { gastos: lista, total };
};

// Se registra después de la ruta de viajes, así que tiene prioridad para /viajes/:id/gastos
const simularGastos = async () => {
  await paginaActual().route('**/api/viajes/*/gastos', (route) => {
    // Historial de Control de Gastos con lo registrado en el escenario
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(historial()) });
    }
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

Then('estoy en el control de gastos del viaje', async () => {
  await expect(paginaActual()).toHaveURL(/\/viajes\/viaje-\d+\/gastos$/);
  await expect(paginaActual().getByText('Control de Gastos', { exact: true })).toBeVisible();
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

// Historial (PB-24)

// Filas del historial de Control de Gastos
const filasDelHistorial = () =>
  paginaActual().getByRole('list', { name: 'Historial de gastos' }).getByRole('listitem');

Given(
  'que en el viaje {string} hay un gasto {string} de {float} pagado por {string} el {string}',
  (viaje: string, concepto: string, importe: number, pagador: string, fecha: string) => {
    expect(idDelViaje(viaje), `el viaje "${viaje}" no está preparado`).toBeDefined();
    previos.push({ concepto, importe, categoria: 'comida', pagado_por: ID_DE[pagador], participantes: [], fecha });
  },
);

When('abro el control de gastos del viaje {string}', async (nombre: string) => {
  const id = idDelViaje(nombre);
  expect(id, `el viaje "${nombre}" no está preparado`).toBeDefined();
  await simularGastos();
  await paginaActual().goto(new URL(`/viajes/${id}/gastos`, paginaActual().url()).toString());
  await expect(paginaActual().getByRole('region', { name: 'Total gastado' })).toBeVisible();
});

Then('el total gastado es {string}', async (total: string) => {
  await expect(paginaActual().getByRole('region', { name: 'Total gastado' })).toContainText(total);
});

// Conceptos separados por comas, en el orden en que deben aparecer
Then('veo en el historial de gastos, por este orden, {string}', async (conceptos: string) => {
  const esperados = conceptos.split(', ');
  await expect(filasDelHistorial()).toHaveCount(esperados.length);
  for (const [i, concepto] of esperados.entries()) {
    await expect(filasDelHistorial().nth(i)).toContainText(concepto);
  }
});

Then('el gasto {string} lo pagó {string} el {string}', async (concepto: string, pagador: string, fecha: string) => {
  await expect(filasDelHistorial().filter({ hasText: concepto })).toContainText(`Pagó ${pagador} · ${fecha}`);
});
