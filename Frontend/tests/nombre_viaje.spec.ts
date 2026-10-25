import { test, expect, type Page } from '@playwright/test';

const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';

const sesion = {
  usuario: {
    id: USUARIO_ID,
    nombre: 'Adriana',
    email: 'adriana@travelwrap.app',
    avatar_url: null,
    creado_en: '2026-10-06T15:29:32Z',
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

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

const simularBackend = async (page: Page) => {
  const creados: Record<string, unknown>[] = [];
  const guardados: Record<string, unknown>[] = [];
  await page.route('**/api/viajes/*', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop();
    const encontrado = guardados.find((v) => v.id === id);
    return route.fulfill({
      status: encontrado ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(encontrado ?? { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe' } }),
    });
  });
  await page.route('**/api/viajes', (route) => {
    if (route.request().method() !== 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ viajes: [] }) });
    }
    const datos = route.request().postDataJSON();
    creados.push(datos);
    const nuevo = {
      id: 'viaje-1',
      descripcion: null,
      moneda: 'EUR',
      estado: 'activo',
      creado_en: '2026-10-25T10:00:00Z',
      pendiente_destino: datos.destino === null,
      rol: 'creador',
      miembros: [{ usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'creador' }],
      ...datos,
    };
    guardados.push(nuevo);
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(nuevo) });
  });
  return { creados };
};

test.describe('Nuevo viaje · nombre por defecto', () => {
  test('el campo Nombre queda vacío y al crear se guarda el destino con el año', async ({ page }) => {
    await entrarConSesion(page);
    const { creados } = await simularBackend(page);

    await page.goto('/viajes/nuevo');
    await page.getByPlaceholder('Ciudad o país').fill('Roma');
    await page.getByLabel('Fecha inicio').fill('2027-05-12');
    await page.getByLabel('Fecha fin').fill('2027-05-15');
    await page.getByLabel('Presupuesto estimado (€)').fill('850');

    await expect(page.getByLabel('Nombre del viaje')).toHaveValue('');
    await page.getByRole('button', { name: 'Crear viaje', exact: true }).click();

    await expect(page).toHaveURL(/\/viajes\/viaje-1$/);
    expect(creados).toEqual([
      { nombre: 'Roma 2027', presupuesto: 850, destino: 'Roma', fecha_inicio: '2027-05-12', fecha_fin: '2027-05-15' },
    ]);
  });

  test('un viaje de diciembre a enero se guarda con los dos años', async ({ page }) => {
    await entrarConSesion(page);
    const { creados } = await simularBackend(page);

    await page.goto('/viajes/nuevo');
    await page.getByPlaceholder('Ciudad o país').fill('Praga');
    await page.getByLabel('Fecha inicio').fill('2027-12-28');
    await page.getByLabel('Fecha fin').fill('2028-01-03');
    await page.getByLabel('Presupuesto estimado (€)').fill('600');
    await page.getByRole('button', { name: 'Crear viaje', exact: true }).click();

    await expect(page).toHaveURL(/\/viajes\/viaje-1$/);
    expect(creados[0].nombre).toBe('Praga 2027-2028');
  });

  test('si el usuario escribe su propio nombre, se respeta', async ({ page }) => {
    await entrarConSesion(page);
    const { creados } = await simularBackend(page);

    await page.goto('/viajes/nuevo');
    await page.getByLabel('Nombre del viaje').fill('Escapada con los primos');
    await page.getByPlaceholder('Ciudad o país').fill('Roma');
    await page.getByLabel('Fecha inicio').fill('2027-05-12');
    await page.getByLabel('Presupuesto estimado (€)').fill('850');
    await page.getByRole('button', { name: 'Crear viaje', exact: true }).click();

    await expect(page).toHaveURL(/\/viajes\/viaje-1$/);
    expect(creados[0].nombre).toBe('Escapada con los primos');
  });

  test('con «Votar destino» hace falta escribir el nombre', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto('/viajes/nuevo');
    await page.getByRole('radio', { name: /Votar destino/ }).click();
    await page.getByLabel('Presupuesto estimado (€)').fill('850');
    await expect(page.getByRole('button', { name: 'Crear viaje y elegir destino' })).toBeDisabled();

    await page.getByLabel('Nombre del viaje').fill('Verano 2027');
    await expect(page.getByRole('button', { name: 'Crear viaje y elegir destino' })).toBeEnabled();
  });

  test('con «Votar destino» al crear el viaje se abre la votación del destino', async ({ page }) => {
    await entrarConSesion(page);
    const { creados } = await simularBackend(page);

    await page.goto('/viajes/nuevo');
    await page.getByRole('radio', { name: /Votar destino/ }).click();
    await page.getByLabel('Nombre del viaje').fill('Verano 2027');
    await page.getByLabel('Presupuesto estimado (€)').fill('900');
    await page.getByRole('button', { name: 'Crear viaje y elegir destino' }).click();

    await expect(page).toHaveURL(/\/viajes\/viaje-1\/destino$/);
    expect(creados[0]).toMatchObject({ nombre: 'Verano 2027', destino: null });
  });
});
