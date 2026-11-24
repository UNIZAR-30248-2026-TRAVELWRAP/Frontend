import { test, expect, type Page, type Route } from '@playwright/test';

// Playlist compartida del viaje (PB-56): desde el inicio del viaje se enlaza una playlist de Spotify y queda visible
const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA_ID = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f';
const VIAJE_ID = 'roma';
const ID = '37i9dQZF1DXcBWIGoYBM5M';

const sesion = {
  usuario: { id: USUARIO_ID, nombre: 'Adriana', email: EMAIL, avatar_url: null, creado_en: '2026-10-06T15:29:32Z' },
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

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

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
  rol: 'creador',
  archivado: false,
  miembros: [
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: BERTA_ID, nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
};

// API simulada: el viaje, sus gastos y la playlist, que empieza sin enlazar y se guarda al recibir el PUT
const simularViaje = async (page: Page) => {
  let playlist: { url: string; actualizado_en: string } | null = null;
  await page.route(`**/api/viajes/${VIAJE_ID}`, (route) => json(route, 200, viaje));
  await page.route(`**/api/viajes/${VIAJE_ID}/gastos/balance`, (route) => json(route, 200, { saldos: [], total: 0 }));
  await page.route(`**/api/viajes/${VIAJE_ID}/playlist`, (route) => {
    if (route.request().method() === 'PUT') {
      playlist = { url: `https://open.spotify.com/playlist/${ID}`, actualizado_en: '2026-11-22T10:00:00Z' };
      return json(route, 200, { playlist });
    }
    return json(route, 200, { playlist });
  });
};

test.describe('Playlist del viaje', () => {
  test('se enlaza una playlist de Spotify desde el inicio y queda visible con su enlace', async ({ page }) => {
    await entrarConSesion(page);
    await simularViaje(page);

    await page.goto(`/viajes/${VIAJE_ID}`);
    await page.getByRole('button', { name: 'Añadir playlist' }).click();
    await page.getByLabel('Enlace de la playlist de Spotify').fill(`https://open.spotify.com/intl-es/playlist/${ID}?si=abc`);
    await page.getByRole('button', { name: 'Guardar playlist' }).click();

    const enlace = page.getByRole('link', { name: 'Abrir la playlist del viaje en Spotify' });
    await expect(enlace).toBeVisible();
    await expect(enlace).toHaveAttribute('href', `https://open.spotify.com/playlist/${ID}`);
  });
});
