import { test, expect, type Page, type Route } from '@playwright/test';

const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA_ID = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f';
const DANIEL_ID = '8c4d2e1f-3a5b-4c6d-9e7f-1a2b3c4d5e6f';
const VIAJE_ID = 'roma';

const sesion = {
  usuario: {
    id: USUARIO_ID,
    nombre: 'Adriana',
    email: EMAIL,
    avatar_url: null,
    creado_en: '2026-10-06T15:29:32Z',
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

const viaje = {
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 850,
  estado: 'activo',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'miembro',
  miembros: [
    { usuario_id: DANIEL_ID, nombre: 'Daniel', avatar_url: null, rol: 'creador' },
    { usuario_id: BERTA_ID, nombre: 'Berta', avatar_url: null, rol: 'miembro' },
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
};

// Sesión guardada como la deja el login, solo en la primera carga de la página
const entrarConSesion = async (page: Page) => {
  await page.addInitScript((datos) => {
    if (!sessionStorage.getItem('sesionSembrada')) {
      localStorage.setItem('travelwrap.sesion', JSON.stringify(datos));
      sessionStorage.setItem('sesionSembrada', '1');
    }
  }, sesion);
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: sesion.token, refresh_token: sesion.refresh_token }),
    }),
  );
};

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

// Backend simulado: el viaje con sus tres miembros y POST /gastos con la respuesta indicada.
// Devuelve los gastos recibidos para comprobar qué ha enviado la pantalla
const simularBackend = async (
  page: Page,
  respuestaGasto: (cuerpo: Record<string, unknown>) => { status: number; cuerpo: unknown } = (cuerpo) => ({
    status: 201,
    cuerpo: { id: 'g1', viaje_id: VIAJE_ID, ...cuerpo, repartos: [] },
  }),
) => {
  const recibidos: { cabecera: string | undefined; cuerpo: Record<string, unknown> }[] = [];

  await page.route('**/api/viajes/**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');

    if (ruta === `/viajes/${VIAJE_ID}/gastos` && peticion.method() === 'POST') {
      const cuerpo = peticion.postDataJSON();
      recibidos.push({ cabecera: peticion.headers()['authorization'], cuerpo });
      const { status, cuerpo: respuesta } = respuestaGasto(cuerpo);
      return json(route, status, respuesta);
    }
    return json(route, 200, viaje);
  });

  return { recibidos };
};

const rutaFormulario = `/viajes/${VIAJE_ID}/gastos/nuevo`;

// Parte que muestra la fila de un miembro en «Dividir entre»
const parteDe = (page: Page, nombre: string) =>
  page.locator('label').filter({ has: page.getByLabel(`Dividir con ${nombre}`) }).getByText(/€$/);

test.describe('Añadir gasto', () => {
  test('se registra un gasto dividido entre todos y se vuelve al viaje', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidos } = await simularBackend(page);

    await page.goto(rutaFormulario);
    await expect(page.getByRole('radio', { name: 'Adriana' })).toHaveAttribute('aria-checked', 'true');
    await page.getByLabel('Importe').fill('60,50');
    await page.getByLabel('Concepto').fill('Cena en el Trastevere');
    await page.getByRole('button', { name: 'Registrar gasto' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}$`));
    expect(recibidos).toHaveLength(1);
    expect(recibidos[0].cabecera).toBe('Bearer token-acceso');
    expect(recibidos[0].cuerpo).toEqual({
      concepto: 'Cena en el Trastevere',
      importe: 60.5,
      categoria: 'comida',
      pagado_por: USUARIO_ID,
      participantes: [DANIEL_ID, BERTA_ID, USUARIO_ID],
    });
  });

  test('se puede cambiar la categoría, quién pagó y entre quiénes se divide', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidos } = await simularBackend(page);

    await page.goto(rutaFormulario);
    await page.getByLabel('Importe').fill('35');
    await page.getByLabel('Concepto').fill('Taxi');
    await page.getByRole('radio', { name: 'Transporte' }).click();
    await page.getByRole('radio', { name: 'Berta' }).click();
    await page.getByLabel('Dividir con Daniel').uncheck();
    await page.getByRole('button', { name: 'Registrar gasto' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}$`));
    expect(recibidos[0].cuerpo).toEqual({
      concepto: 'Taxi',
      importe: 35,
      categoria: 'transporte',
      pagado_por: BERTA_ID,
      participantes: [BERTA_ID, USUARIO_ID],
    });
  });

  test('muestra la parte de cada uno y la recalcula al cambiar el reparto', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(rutaFormulario);
    await page.getByLabel('Importe').fill('10');

    await expect(parteDe(page, 'Daniel')).toHaveText('3,34 €');
    await expect(parteDe(page, 'Berta')).toHaveText('3,33 €');
    await expect(parteDe(page, 'Adriana')).toHaveText('3,33 €');

    await page.getByLabel('Dividir con Berta').uncheck();

    await expect(parteDe(page, 'Daniel')).toHaveText('5,00 €');
    await expect(parteDe(page, 'Berta')).toHaveCount(0);
    await expect(parteDe(page, 'Adriana')).toHaveText('5,00 €');
  });

  test('sin importe válido no se envía y se explica el motivo', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidos } = await simularBackend(page);

    await page.goto(rutaFormulario);
    await page.getByLabel('Importe').fill('10,123');
    await page.getByLabel('Concepto').fill('Cena');
    await page.getByRole('button', { name: 'Registrar gasto' }).click();

    await expect(page.getByRole('alert')).toHaveText('Escribe un importe mayor que 0 con dos decimales como máximo');
    expect(recibidos).toHaveLength(0);
  });

  test('sin nadie en el reparto no se envía y se explica el motivo', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidos } = await simularBackend(page);

    await page.goto(rutaFormulario);
    await page.getByLabel('Importe').fill('10');
    await page.getByLabel('Concepto').fill('Cena');
    for (const nombre of ['Daniel', 'Berta', 'Adriana']) await page.getByLabel(`Dividir con ${nombre}`).uncheck();
    await page.getByRole('button', { name: 'Registrar gasto' }).click();

    await expect(page.getByRole('alert')).toHaveText('Elige al menos un miembro entre los que dividir el gasto');
    expect(recibidos).toHaveLength(0);
  });

  test('si el servidor rechaza el gasto se muestra el error y se sigue en el formulario', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, () => ({
      status: 409,
      cuerpo: { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' } },
    }));

    await page.goto(rutaFormulario);
    await page.getByLabel('Importe').fill('20');
    await page.getByLabel('Concepto').fill('Museo');
    await page.getByRole('button', { name: 'Registrar gasto' }).click();

    await expect(page.getByRole('alert')).toHaveText('El viaje está cerrado y ya no se puede modificar');
    await expect(page).toHaveURL(new RegExp(`${rutaFormulario}$`));
  });

  test('el botón de volver lleva al inicio del viaje', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(rutaFormulario);
    await page.getByRole('button', { name: 'Volver' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}$`));
  });
});
