import { test, expect, type Page } from '@playwright/test';

const EMAIL = 'daniel@travelwrap.app';

const sesion = {
  usuario: {
    id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
    nombre: 'Daniel',
    email: EMAIL,
    avatar_url: null,
    creado_en: '2026-10-06T15:29:32Z',
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

const viaje = (id: string, datos: Record<string, unknown> = {}) => ({
  id,
  nombre: `Viaje ${id}`,
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 850,
  estado: 'activo',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'creador',
  miembros: [{ usuario_id: sesion.usuario.id, nombre: 'Daniel', avatar_url: null, rol: 'creador' }],
  ...datos,
});

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

// Backend de viajes simulado en memoria: GET devuelve la lista y POST añade el viaje creado
const simularBackendViajes = async (page: Page, iniciales: ReturnType<typeof viaje>[] = []) => {
  const viajes = [...iniciales];
  const creados: unknown[] = [];
  await page.route('**/api/viajes', async (route) => {
    if (route.request().method() === 'POST') {
      const datos = route.request().postDataJSON();
      creados.push(datos);
      const nuevo = viaje(`nuevo-${creados.length}`, { ...datos, pendiente_destino: datos.destino === null });
      viajes.unshift(nuevo);
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(nuevo) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ viajes }) });
  });
  await page.route('**/api/viajes/*', async (route) => {
    const id = new URL(route.request().url()).pathname.split('/').pop();
    const encontrado = viajes.find((v) => v.id === id);
    return route.fulfill({
      status: encontrado ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(encontrado ?? { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe' } }),
    });
  });
  return { creados };
};

test.describe('RF8 · Mis viajes y crear viaje', () => {
  test('Mis viajes reparte los viajes reales: activos, pendientes de destino y finalizados', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackendViajes(page, [
      viaje('a', { nombre: 'Lisboa 2027', presupuesto: 1240 }),
      viaje('b', { nombre: 'Verano 2027', destino: null, pendiente_destino: true }),
      viaje('c', { nombre: 'Praga 2025', estado: 'finalizado', fecha_inicio: '2025-06-20', fecha_fin: '2025-06-24' }),
      viaje('d', { nombre: 'Archivado 2024', estado: 'archivado' }),
    ]);

    await page.goto('/');

    const activo = page.getByRole('button', { name: /Lisboa 2027/ });
    await expect(activo).toContainText('En curso');
    await expect(activo).toContainText('PRESUPUESTO');
    await expect(activo).toContainText('1.240 €');
    await expect(page.getByRole('button', { name: /Verano 2027/ })).toContainText('Pendiente de destino');
    await expect(page.getByRole('button', { name: /Praga 2025/ })).toContainText('20–24 jun 2025');
    await expect(page.getByText('Archivado 2024')).toHaveCount(0);
  });

  test('crear un viaje con destino lo envía al backend y abre directamente la pantalla del viaje', async ({ page }) => {
    await entrarConSesion(page);
    const { creados } = await simularBackendViajes(page);

    await page.goto('/');
    await page.getByRole('button', { name: 'Crear nuevo viaje' }).click();
    await expect(page).toHaveURL(/\/viajes\/nuevo$/);

    await page.getByLabel('Nombre del viaje').fill('Escapada a París');
    await page.getByLabel('Fecha inicio').fill('2027-04-10');
    await page.getByLabel('Fecha fin').fill('2027-04-13');
    await page.getByLabel('Presupuesto estimado (€)').fill('900');
    await page.getByPlaceholder('Ciudad o país').fill('París');
    await page.getByRole('button', { name: 'Crear viaje', exact: true }).click();

    await expect(page).toHaveURL(/\/viajes\/nuevo-1$/);
    await expect(page.getByText('Escapada a París')).toBeVisible();
    await expect(page.getByText('900 €')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Secciones del viaje' })).toBeVisible();
    expect(creados).toEqual([
      { nombre: 'Escapada a París', presupuesto: 900, destino: 'París', fecha_inicio: '2027-04-10', fecha_fin: '2027-04-13' },
    ]);
  });

  test('si el backend rechaza el viaje se muestra el error y se sigue en el formulario', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackendViajes(page);
    await page.route('**/api/viajes', (route) =>
      route.request().method() === 'POST'
        ? route.fulfill({
            status: 502,
            contentType: 'application/json',
            body: JSON.stringify({ error: { codigo: 'error_viaje', mensaje: 'No se ha podido crear el viaje' } }),
          })
        : route.fallback(),
    );

    await page.goto('/viajes/nuevo');
    await page.getByLabel('Nombre del viaje').fill('Roma 2027');
    await page.getByLabel('Presupuesto estimado (€)').fill('850');
    await page.getByPlaceholder('Ciudad o país').fill('Roma');
    await page.getByRole('button', { name: 'Crear viaje', exact: true }).click();

    await expect(page.getByRole('alert')).toHaveText('No se ha podido crear el viaje');
    await expect(page).toHaveURL(/\/viajes\/nuevo$/);
  });
});
