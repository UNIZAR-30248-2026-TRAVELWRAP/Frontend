import { test, expect, type Page, type Route } from '@playwright/test';

// Actividad en curso (naranja en el itinerario) y próxima actividad (tarjeta de inicio) según la hora
const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA_ID = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f';
const VIAJE_ID = 'roma';
const NARANJA = 'rgb(221, 107, 32)';

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
  fecha_fin: '2027-05-14',
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

const actividad = (id: string, titulo: string, hora_inicio: string, hora_fin: string | null, orden: number) => ({
  id,
  viaje_id: VIAJE_ID,
  titulo,
  descripcion: null,
  fecha: '2027-05-12',
  hora_inicio,
  hora_fin,
  orden,
  ubicacion_nombre: null,
  latitud: null,
  longitud: null,
  lugar_externo_id: null,
  categoria: 'cultura',
  creado_por: USUARIO_ID,
  creado_en: '2026-10-24T10:00:00Z',
  actualizado_en: '2026-10-24T10:00:00Z',
});

const actividades = [
  actividad('a1', 'Coliseo Romano', '09:00', '10:30', 0),
  actividad('a2', 'Foro Romano', '11:00', '12:30', 1),
];

// API simulada: el viaje, sus actividades y lo demás vacío
const simularViaje = async (page: Page) => {
  await page.route(`**/api/viajes/${VIAJE_ID}`, (route) => json(route, 200, viaje));
  await page.route(`**/api/viajes/${VIAJE_ID}/gastos/balance`, (route) => json(route, 200, { saldos: [], total: 0 }));
  await page.route(`**/api/viajes/${VIAJE_ID}/playlist`, (route) => json(route, 200, { playlist: null }));
  await page.route(`**/api/viajes/${VIAJE_ID}/tareas`, (route) => json(route, 200, { tareas: [] }));
  await page.route(
    (url) => url.pathname === `/api/viajes/${VIAJE_ID}/actividades`,
    (route) => json(route, 200, { actividades }),
  );
};

// Color del texto de la hora de una actividad en el itinerario
const colorDeLaHora = (page: Page, hora: string) =>
  page.getByText(hora, { exact: true }).first().evaluate((el) => getComputedStyle(el).color);

test.describe('Actividad en curso y próxima actividad', () => {
  test('en el itinerario la actividad en curso va en naranja y avanza con la hora', async ({ page }) => {
    await entrarConSesion(page);
    await simularViaje(page);

    // A las 9:30 está en curso la primera
    await page.clock.setFixedTime(new Date('2027-05-12T09:30:00'));
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect.poll(() => colorDeLaHora(page, '09:00 – 10:30 h')).toBe(NARANJA);
    expect(await colorDeLaHora(page, '11:00 – 12:30 h')).not.toBe(NARANJA);

    // A las 11:10 ya ha empezado la segunda y la naranja pasa a ella
    await page.clock.setFixedTime(new Date('2027-05-12T11:10:00'));
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect.poll(() => colorDeLaHora(page, '11:00 – 12:30 h')).toBe(NARANJA);
    expect(await colorDeLaHora(page, '09:00 – 10:30 h')).not.toBe(NARANJA);
  });

  test('la pantalla de inicio enseña la próxima actividad y cuánto falta', async ({ page }) => {
    await entrarConSesion(page);
    await simularViaje(page);

    await page.clock.setFixedTime(new Date('2027-05-12T09:30:00'));
    await page.goto(`/viajes/${VIAJE_ID}`);

    const tarjeta = page.getByRole('region', { name: 'Próxima actividad' });
    await expect(tarjeta).toContainText('Foro Romano');
    await expect(tarjeta).toContainText('En 1h 30m');
  });
});
