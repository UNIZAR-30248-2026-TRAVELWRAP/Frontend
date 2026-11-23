import { test, expect, type Page, type Route } from '@playwright/test';

const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA_ID = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f';
const VIAJE_ID = 'roma';

const sesion = {
  usuario: { id: USUARIO_ID, nombre: 'Adriana', email: EMAIL, avatar_url: null, creado_en: '2026-10-06T15:29:32Z' },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

const viajeBase = {
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 850,
  estado: 'finalizado',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  archivado: false,
  rol: 'miembro',
  miembros: [
    { usuario_id: BERTA_ID, nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
};

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const entrarConSesion = async (page: Page) => {
  await page.addInitScript((datos) => {
    if (!sessionStorage.getItem('sesionSembrada')) {
      localStorage.setItem('travelwrap.sesion', JSON.stringify(datos));
      sessionStorage.setItem('sesionSembrada', '1');
    }
  }, sesion);
  await page.route('**/api/auth/refresh', (route) =>
    json(route, 200, { token: sesion.token, refresh_token: sesion.refresh_token }),
  );
};

// Backend simulado: el viaje empieza finalizado y `reabrir` decide la respuesta de POST /reabrir
const simularBackend = async (page: Page, reabrir: (route: Route) => Promise<void> | void = (route) => json(route, 200, { ...viajeBase, estado: 'activo' })) => {
  const llamadas = { reabrir: 0 };
  await page.route('**/api/viajes/**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    if (ruta === `/viajes/${VIAJE_ID}/reabrir` && peticion.method() === 'POST') {
      llamadas.reabrir += 1;
      return reabrir(route);
    }
    if (ruta === `/viajes/${VIAJE_ID}/resumen`) {
      return json(route, 200, { dias: 4, actividad_mas_votada: null, alma_del_grupo: null });
    }
    if (ruta === `/viajes/${VIAJE_ID}/fotos`) return json(route, 200, { fotos: [] });
    if (ruta === `/viajes/${VIAJE_ID}/sello`) return json(route, 200, { sello: null });
    return json(route, 200, llamadas.reabrir > 0 && ruta === `/viajes/${VIAJE_ID}` ? { ...viajeBase, estado: 'activo' } : viajeBase);
  });
  return llamadas;
};

const llegarALasAcciones = async (page: Page) => {
  await page.goto(`/viajes/${VIAJE_ID}/resumen`);
  await expect(page.getByText('TravelWrap · Resumen')).toBeVisible();
  await expect(async () => {
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('button', { name: 'Reabrir viaje' })).toBeVisible({ timeout: 500 });
  }).toPass();
};

test.describe('Reabrir un viaje finalizado (PB-65)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('reabrir con confirmación lleva al inicio del viaje, que vuelve a estar activo', async ({ page }) => {
    await entrarConSesion(page);
    const llamadas = await simularBackend(page);

    await llegarALasAcciones(page);
    await page.getByRole('button', { name: 'Reabrir viaje' }).click();
    await expect(page.getByRole('dialog')).toContainText('¿Reabrir este viaje?');
    await page.getByRole('dialog').getByRole('button', { name: 'Reabrir viaje' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}$`));
    await expect(page.getByText('Este viaje está finalizado')).toHaveCount(0);
    expect(llamadas.reabrir).toBe(1);
  });

  test('cancelar la confirmación no llama al servidor', async ({ page }) => {
    await entrarConSesion(page);
    const llamadas = await simularBackend(page);

    await llegarALasAcciones(page);
    await page.getByRole('button', { name: 'Reabrir viaje' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/resumen$/);
    expect(llamadas.reabrir).toBe(0);
  });

  test('si el servidor falla muestra el error y el viaje sigue finalizado', async ({ page }) => {
    await entrarConSesion(page);
    const llamadas = await simularBackend(page, (route) =>
      json(route, 409, { error: { codigo: 'viaje_no_finalizado', mensaje: 'Solo se pueden reabrir viajes finalizados' } }),
    );

    await llegarALasAcciones(page);
    await page.getByRole('button', { name: 'Reabrir viaje' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reabrir viaje' }).click();

    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('Solo se pueden reabrir viajes finalizados');
    await expect(page).toHaveURL(/\/resumen$/);
    expect(llamadas.reabrir).toBe(1);
  });

  test('un viaje activo no tiene diapositiva de acciones ni botón para reabrir', async ({ page }) => {
    await entrarConSesion(page);
    await page.route('**/api/viajes/**', async (route) => {
      const ruta = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
      if (ruta.endsWith('/resumen')) return json(route, 200, { dias: 4, actividad_mas_votada: null, alma_del_grupo: null });
      if (ruta.endsWith('/fotos')) return json(route, 200, { fotos: [] });
      if (ruta.endsWith('/sello')) return json(route, 200, { sello: null });
      return json(route, 200, { ...viajeBase, estado: 'activo' });
    });

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);
    await expect(page.getByText('TravelWrap · Resumen')).toBeVisible();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');

    await expect(page.getByRole('region')).toHaveAccessibleName(/3 de 3: Resumen/);
    await expect(page.getByRole('button', { name: 'Reabrir viaje' })).toHaveCount(0);
  });
});
