import { test, expect, type Page, type Route } from '@playwright/test';

const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const VIAJE_ID = 'roma';

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

const viaje = (datos: Record<string, unknown> = {}) => ({
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
  rol: 'miembro',
  miembros: [
    { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
  ...datos,
});

const actividad = (id: string, datos: Record<string, unknown> = {}) => ({
  id,
  viaje_id: VIAJE_ID,
  titulo: `Actividad ${id}`,
  descripcion: null,
  fecha: '2027-05-12',
  hora_inicio: null as string | null,
  hora_fin: null,
  orden: 0,
  ubicacion_nombre: null as string | null,
  latitud: null as number | null,
  longitud: null as number | null,
  lugar_externo_id: null,
  categoria: null,
  creado_por: null as string | null,
  creado_en: '2026-10-24T10:00:00Z',
  actualizado_en: '2026-10-24T10:00:00Z',
  ...datos,
});

const ACTIVIDADES = [
  actividad('coliseo', {
    titulo: 'Visita al Coliseo',
    hora_inicio: '10:00:00',
    ubicacion_nombre: 'Colosseo, Roma',
    latitud: 41.890214,
    longitud: 12.492231,
    lugar_externo_id: 'way/24146600',
  }),
  actividad('foro', {
    titulo: 'Foro Romano',
    hora_inicio: '12:00:00',
    ubicacion_nombre: 'Foro Romano, Roma',
    latitud: 41.892462,
    longitud: 12.485325,
  }),
  actividad('cena', { titulo: 'Cena', hora_inicio: '21:00:00', ubicacion_nombre: 'Trastevere' }),
  actividad('vaticano', {
    titulo: 'Vaticano',
    fecha: '2027-05-13',
    hora_inicio: '09:00:00',
    ubicacion_nombre: 'Ciudad del Vaticano',
    latitud: 41.9022,
    longitud: 12.4539,
  }),
  actividad('paseo', { titulo: 'Paseo', fecha: '2027-05-14', ubicacion_nombre: 'Trastevere' }),
];

const TESELA = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const preparar = async (page: Page, datosViaje: Record<string, unknown> = {}, actividades = ACTIVIDADES) => {
  const teselas: string[] = [];
  await page.addInitScript((datos) => {
    if (!sessionStorage.getItem('sesionSembrada')) {
      localStorage.setItem('travelwrap.sesion', JSON.stringify(datos));
      sessionStorage.setItem('sesionSembrada', '1');
    }
  }, sesion);
  await page.route('**/api/auth/refresh', (route) =>
    json(route, 200, { token: sesion.token, refresh_token: sesion.refresh_token }),
  );
  await page.route('https://tile.openstreetmap.org/**', (route) => {
    teselas.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'image/png', body: TESELA });
  });
  await page.route('**/api/viajes/**', (route) => {
    const ruta = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
    if (ruta === `/viajes/${VIAJE_ID}/actividades`) return json(route, 200, { actividades });
    return json(route, 200, viaje(datosViaje));
  });
  return teselas;
};

const mapa = (page: Page) => page.getByRole('region', { name: 'Mapa de las actividades del día' });
const marcadores = (page: Page) => page.locator('.leaflet-marker-icon');
const lineaDeRuta = (page: Page) => page.locator('.leaflet-overlay-pane path');

test.describe('Itinerario · mapa de las actividades', () => {
  test('enseña un marcador numerado por cada actividad del día con ubicación y cuenta cuántas hay', async ({ page }) => {
    const teselas = await preparar(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(mapa(page)).toBeVisible();
    await expect(marcadores(page)).toHaveCount(2);
    await expect(page.getByRole('button', { name: '1. Visita al Coliseo' })).toBeVisible();
    await expect(page.getByRole('button', { name: '2. Foro Romano' })).toBeVisible();
    await expect(page.getByText('2 de 3 actividades con ubicación en el mapa')).toBeVisible();
    expect(teselas.length).toBeGreaterThan(0);
    expect(teselas[0]).toMatch(/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/);
  });

  test('cada marcador lleva su número dentro de la chincheta', async ({ page }) => {
    await preparar(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(marcadores(page).nth(0).locator('text')).toHaveText('1');
    await expect(marcadores(page).nth(1).locator('text')).toHaveText('2');
  });

  test('muestra la atribución de OpenStreetMap', async ({ page }) => {
    await preparar(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(mapa(page).getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute(
      'href',
      'https://www.openstreetmap.org/copyright',
    );
  });

  test('con varias actividades con ubicación una línea las une en orden', async ({ page }) => {
    await preparar(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(marcadores(page)).toHaveCount(2);
    await expect(lineaDeRuta(page)).toHaveCount(1);
    await expect(lineaDeRuta(page)).toHaveAttribute('stroke-dasharray', '8 8');
  });

  test('con una sola actividad con ubicación no se dibuja ninguna línea', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(lineaDeRuta(page)).toHaveCount(1);

    await page.getByRole('button', { name: 'Día 2 · 13 may' }).click();

    await expect(marcadores(page)).toHaveCount(1);
    await expect(lineaDeRuta(page)).toHaveCount(0);
  });

  test('al tocar un marcador se abre su título y su lugar', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await page.getByRole('button', { name: '1. Visita al Coliseo' }).click();

    const ventana = page.locator('.leaflet-popup-content');
    await expect(ventana).toContainText('Visita al Coliseo');
    await expect(ventana).toContainText('Colosseo, Roma');
  });

  test('al cambiar de día el mapa enseña los marcadores de ese día', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(marcadores(page)).toHaveCount(2);

    await page.getByRole('button', { name: 'Día 2 · 13 may' }).click();

    await expect(marcadores(page)).toHaveCount(1);
    await expect(page.getByRole('button', { name: '1. Vaticano' })).toBeVisible();
    await expect(page.getByText('1 de 1 actividad con ubicación en el mapa')).toBeVisible();
  });

  test('un día sin ubicaciones sigue enseñando el mapa, sin marcadores, con el aviso', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(marcadores(page)).toHaveCount(2);

    await page.getByRole('button', { name: 'Día 3 · 14 may' }).click();

    await expect(mapa(page)).toBeVisible();
    await expect(marcadores(page)).toHaveCount(0);
    await expect(page.getByText(/Ninguna actividad de este día tiene ubicación en el mapa/)).toBeVisible();
  });

  test('un día sin actividades también enseña el mapa', async ({ page }) => {
    await preparar(page, {}, [ACTIVIDADES[0]]);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await page.getByRole('button', { name: 'Día 2 · 13 may' }).click();

    await expect(page.getByText('No hay actividades este día.')).toBeVisible();
    await expect(mapa(page)).toBeVisible();
    await expect(marcadores(page)).toHaveCount(0);
  });

  test('en un viaje archivado el mapa se ve igual', async ({ page }) => {
    await preparar(page, { estado: 'archivado' });

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(marcadores(page)).toHaveCount(2);
  });

  test('los botones de zoom son lo bastante grandes para el dedo y se pueden pulsar', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(marcadores(page)).toHaveCount(2);

    const ampliar = page.getByRole('button', { name: 'Zoom in' });
    const reducir = page.getByRole('button', { name: 'Zoom out' });
    for (const boton of [ampliar, reducir]) {
      const caja = await boton.boundingBox();
      expect(caja?.width).toBeGreaterThanOrEqual(40);
      expect(caja?.height).toBeGreaterThanOrEqual(40);
    }
    await ampliar.click();
    await expect(marcadores(page).first()).toBeVisible();
    await reducir.click();
    await reducir.click();
    await expect(marcadores(page)).toHaveCount(2);
  });

  test('en un móvil estrecho el mapa cabe sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await preparar(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(marcadores(page)).toHaveCount(2);

    const [ancho, visible] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(ancho).toBeLessThanOrEqual(visible);
    const caja = await mapa(page).boundingBox();
    expect(caja?.width).toBeLessThanOrEqual(320);
  });
});
