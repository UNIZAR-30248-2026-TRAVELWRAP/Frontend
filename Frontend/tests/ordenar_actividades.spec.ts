import { test, expect, type Locator, type Page, type Route } from '@playwright/test';

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
  titulo: id,
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

const AGENDA = [
  actividad('Desayuno', { hora_inicio: '08:30:00', orden: 0 }),
  actividad('Paseo', { orden: 1 }),
  actividad('Compras', { orden: 2 }),
  actividad('Fotos', { orden: 3 }),
  actividad('Cena', { hora_inicio: '21:00:00', orden: 4 }),
];

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const preparar = async (page: Page, datosViaje: Record<string, unknown> = {}, actividades = AGENDA) => {
  await page.addInitScript((datos) => {
    if (!sessionStorage.getItem('sesionSembrada')) {
      localStorage.setItem('travelwrap.sesion', JSON.stringify(datos));
      sessionStorage.setItem('sesionSembrada', '1');
    }
  }, sesion);
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.route('**/api/auth/refresh', (route) =>
    json(route, 200, { token: sesion.token, refresh_token: sesion.refresh_token }),
  );
  await page.route('**/api/viajes/**', (route) => {
    const ruta = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
    if (ruta === `/viajes/${VIAJE_ID}/actividades`) return json(route, 200, { actividades });
    if (ruta === `/viajes/${VIAJE_ID}/ruta`) return json(route, 502, { error: { codigo: 'error_ruta', mensaje: 'No' } });
    return json(route, 200, viaje(datosViaje));
  });
};

const agenda = (page: Page) => page.getByRole('list', { name: 'Agenda del día' }).getByRole('listitem');
const asa = (page: Page, titulo: string) => page.getByRole('button', { name: `Mover ${titulo}` });

const esperarAlSensor = (page: Page) => page.waitForTimeout(150);

const arrastrar = async (page: Page, origen: Locator, destino: Locator) => {
  await origen.scrollIntoViewIfNeeded();
  const a = await origen.boundingBox();
  const b = await destino.boundingBox();
  if (!a || !b) throw new Error('No se encuentran el origen o el destino del arrastre');
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2 + 12, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 });
  await page.mouse.up();
};

test.describe('Itinerario · reordenar actividades arrastrando', () => {
  test.use({ viewport: { width: 500, height: 1400 } });

  test('tienen asa las actividades sin hora y las que comparten hora, y no las que tienen una hora propia', async ({ page }) => {
    await preparar(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(agenda(page)).toHaveCount(5);
    await expect(asa(page, 'Paseo')).toBeVisible();
    await expect(asa(page, 'Compras')).toBeVisible();
    await expect(asa(page, 'Fotos')).toBeVisible();
    await expect(asa(page, 'Desayuno')).toHaveCount(0);
    await expect(asa(page, 'Cena')).toHaveCount(0);
    await expect(
      page.getByText(
        'Las actividades sin hora se pueden colocar donde quieras arrastrando el asa; las que empiezan a la misma hora, entre sí.',
      ),
    ).toBeVisible();
  });

  test('arrastrar una actividad sin hora a otra posición cambia el orden de la agenda', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(agenda(page)).toHaveText([/^Desayuno/, /^Cena/, /^Paseo/, /^Compras/, /^Fotos/]);

    await arrastrar(page, asa(page, 'Fotos'), agenda(page).nth(2));

    await expect(agenda(page)).toHaveText([/^Desayuno/, /^Cena/, /^Fotos/, /^Paseo/, /^Compras/]);
  });

  test('una actividad sin hora se puede colocar entre las que tienen hora', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await arrastrar(page, asa(page, 'Fotos'), agenda(page).nth(1));

    await expect(agenda(page)).toHaveText([/^Desayuno/, /^Fotos/, /^Cena/, /^Paseo/, /^Compras/]);
  });

  test('una actividad sin hora se puede colocar la primera del día', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await arrastrar(page, asa(page, 'Compras'), agenda(page).nth(0));

    await expect(agenda(page)).toHaveText([/^Compras/, /^Desayuno/, /^Cena/, /^Paseo/, /^Fotos/]);
  });

  test('una única actividad sin hora también se puede colocar entre las que tienen hora', async ({ page }) => {
    await preparar(page, {}, [
      actividad('Desayuno', { hora_inicio: '08:30:00', orden: 0 }),
      actividad('Comida', { hora_inicio: '14:00:00', orden: 1 }),
      actividad('Paseo', { orden: 2 }),
    ]);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await arrastrar(page, asa(page, 'Paseo'), agenda(page).nth(1));

    await expect(agenda(page)).toHaveText([/^Desayuno/, /^Paseo/, /^Comida/]);
  });

  test('las actividades con una hora propia no tienen asa y no se pueden mover', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(page.getByRole('button', { name: 'Mover Desayuno' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mover Cena' })).toHaveCount(0);
    await expect(agenda(page).nth(0)).toHaveText(/^Desayuno/);
    await expect(agenda(page).nth(1)).toHaveText(/^Cena/);
  });

  test('con el teclado se coge el asa, se mueve con las flechas y se suelta', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await asa(page, 'Paseo').focus();
    await page.keyboard.press('Space');
    await esperarAlSensor(page);
    await page.keyboard.press('ArrowDown');
    await esperarAlSensor(page);
    await page.keyboard.press('Space');

    await expect(agenda(page)).toHaveText([/^Desayuno/, /^Cena/, /^Compras/, /^Paseo/, /^Fotos/]);
  });

  test('con Escape se cancela el movimiento con teclado', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await asa(page, 'Paseo').focus();
    await page.keyboard.press('Space');
    await esperarAlSensor(page);
    await page.keyboard.press('ArrowDown');
    await esperarAlSensor(page);
    await page.keyboard.press('Escape');

    await expect(agenda(page)).toHaveText([/^Desayuno/, /^Cena/, /^Paseo/, /^Compras/, /^Fotos/]);
  });

  test('las instrucciones para lectores de pantalla están en español y se anuncian los movimientos', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(page.getByText(/Para mover una actividad pulsa espacio o Intro/)).toHaveCount(1);
    await asa(page, 'Paseo').focus();
    await page.keyboard.press('Space');

    await expect(page.locator('[id^=DndLiveRegion]')).toContainText('«Paseo»');
    await page.keyboard.press('Escape');
  });

  test('los marcadores del mapa y su numeración siguen el nuevo orden', async ({ page }) => {
    const conUbicacion = [
      actividad('Paseo', { orden: 0, ubicacion_nombre: 'Trastevere', latitud: 41.889, longitud: 12.47 }),
      actividad('Compras', { orden: 1, ubicacion_nombre: 'Via del Corso', latitud: 41.9, longitud: 12.48 }),
    ];
    await preparar(page, {}, conUbicacion);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(page.getByRole('button', { name: '1. Paseo' })).toBeVisible();

    await arrastrar(page, asa(page, 'Compras'), agenda(page).nth(0));

    await expect(agenda(page)).toHaveText([/^Compras/, /^Paseo/]);
    await expect(page.getByRole('button', { name: '1. Compras' })).toBeVisible();
    await expect(page.getByRole('button', { name: '2. Paseo' })).toBeVisible();
  });

  test('en un viaje archivado no hay asas', async ({ page }) => {
    await preparar(page, { estado: 'archivado' });

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(agenda(page)).toHaveCount(5);
    await expect(page.getByRole('button', { name: /^Mover / })).toHaveCount(0);
  });

  test('a 320 px el asa cabe en la tarjeta junto a editar y eliminar, sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await preparar(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    const caja = await asa(page, 'Paseo').boundingBox();
    expect(caja?.width).toBeGreaterThanOrEqual(36);
    expect((caja?.x ?? 0) + (caja?.width ?? 0)).toBeLessThanOrEqual(320);
    await expect(page.getByRole('button', { name: 'Editar Paseo' })).toBeVisible();
    const [ancho, visible] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(ancho).toBeLessThanOrEqual(visible);
  });
});
