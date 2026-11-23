import { test, expect, type Page, type Route } from '@playwright/test';

// Cabecera del chat fija (PB-68): al desplazarse por una conversación larga, la cabecera y las pestañas siguen arriba
const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000';

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
  rol: 'miembro',
  archivado: false,
  miembros: [
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: 'otro', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
};

// Conversación larga para que la pantalla tenga que desplazarse
const historial = Array.from({ length: 40 }, (_, i) => ({
  id: `m${i}`,
  texto: `Mensaje número ${i + 1} del grupo`,
  creado_en: `2026-05-12T10:${String(i % 60).padStart(2, '0')}:00Z`,
  autor: { usuario_id: 'otro', nombre: 'Berta', avatar_url: null },
}));

test.describe('Cabecera del chat fija', () => {
  test('al desplazarse por la conversación la cabecera y las pestañas siguen arriba', async ({ page }) => {
    await entrarConSesion(page);
    await page.route(`**/api/viajes/${VIAJE_ID}`, (route) => json(route, 200, viaje));
    await page.route(`**/api/viajes/${VIAJE_ID}/mensajes`, (route) => json(route, 200, { mensajes: historial }));

    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto(`/viajes/${VIAJE_ID}/chat`);
    await expect(page.getByRole('list', { name: 'Mensajes' })).toContainText('Mensaje número 40');

    // Bajamos hasta el último mensaje
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    const pestanas = await page.getByRole('tablist').boundingBox();
    const titulo = await page.getByText('Chat y Galería', { exact: true }).boundingBox();
    expect(pestanas).not.toBeNull();
    expect(titulo).not.toBeNull();
    // La cabecera sigue pegada al borde superior de la pantalla
    expect(pestanas!.y).toBeLessThan(140);
    expect(titulo!.y).toBeLessThan(120);
    await expect(page.getByRole('tablist')).toBeInViewport();
  });
});
