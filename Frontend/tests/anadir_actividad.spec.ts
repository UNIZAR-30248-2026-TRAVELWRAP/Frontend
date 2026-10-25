import { test, expect, type Page, type Route } from '@playwright/test';

const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
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

const viaje = (datos: Record<string, unknown> = {}) => ({
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12' as string | null,
  fecha_fin: '2027-05-15' as string | null,
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

const simularBackend = async (
  page: Page,
  datosViaje: Record<string, unknown> = {},
  respuestaActividad: (cuerpo: Record<string, unknown>) => { status: number; cuerpo: unknown } = (cuerpo) => ({
    status: 201,
    cuerpo: { id: 'a1', ...cuerpo, orden: 0 },
  }),
) => {
  const creadas: { cabecera: string | undefined; cuerpo: Record<string, unknown> }[] = [];

  await page.route('**/api/viajes/**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');

    if (ruta === `/viajes/${VIAJE_ID}/actividades` && peticion.method() === 'POST') {
      const cuerpo = peticion.postDataJSON();
      creadas.push({ cabecera: peticion.headers()['authorization'], cuerpo });
      const { status, cuerpo: respuesta } = respuestaActividad(cuerpo);
      return json(route, status, respuesta);
    }
    return json(route, 200, viaje(datosViaje));
  });

  return { creadas };
};

const rutaFormulario = `/viajes/${VIAJE_ID}/actividades/nueva`;

test.describe('Añadir actividad', () => {
  test('se añade una actividad con título, fecha, hora y ubicación y se vuelve al viaje', async ({ page }) => {
    await entrarConSesion(page);
    const { creadas } = await simularBackend(page);

    await page.goto(rutaFormulario);
    await expect(page.getByText('Itinerario · Roma 2027')).toBeVisible();
    await page.getByRole('button', { name: 'Día 2 · 13 may' }).click();
    await page.getByLabel('Nombre de la actividad').fill('Visita al Coliseo');
    await page.getByLabel('Lugar / Dirección').fill('Piazza del Colosseo');
    await page.getByLabel('Hora').fill('10:00');
    await page.getByRole('button', { name: 'Añadir al itinerario' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/itinerario$`));
    expect(creadas).toHaveLength(1);
    expect(creadas[0].cabecera).toBe('Bearer token-acceso');
    expect(creadas[0].cuerpo).toEqual({
      titulo: 'Visita al Coliseo',
      fecha: '2027-05-13',
      hora_inicio: '10:00',
      ubicacion_nombre: 'Piazza del Colosseo',
    });
  });

  test('con solo el título se usa el primer día y la hora y la ubicación van vacías', async ({ page }) => {
    await entrarConSesion(page);
    const { creadas } = await simularBackend(page);

    await page.goto(rutaFormulario);
    await page.getByLabel('Nombre de la actividad').fill('Paseo');
    await page.getByRole('button', { name: 'Añadir al itinerario' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/itinerario$`));
    expect(creadas[0].cuerpo).toEqual({
      titulo: 'Paseo',
      fecha: '2027-05-12',
      hora_inicio: null,
      ubicacion_nombre: null,
    });
  });

  test('el botón está desactivado hasta escribir el título', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(rutaFormulario);
    const boton = page.getByRole('button', { name: 'Añadir al itinerario' });
    await expect(boton).toBeDisabled();
    await page.getByLabel('Nombre de la actividad').fill('Paseo');
    await expect(boton).toBeEnabled();
  });

  test('si el viaje no tiene fechas se pide la fecha con un campo', async ({ page }) => {
    await entrarConSesion(page);
    const { creadas } = await simularBackend(page, { fecha_inicio: null, fecha_fin: null });

    await page.goto(rutaFormulario);
    await page.getByLabel('Nombre de la actividad').fill('Paseo');
    await expect(page.getByRole('button', { name: 'Añadir al itinerario' })).toBeDisabled();
    await page.getByLabel('Fecha').fill('2027-06-01');
    await page.getByRole('button', { name: 'Añadir al itinerario' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/itinerario$`));
    expect(creadas[0].cuerpo.fecha).toBe('2027-06-01');
  });

  test('si el servidor rechaza la actividad se muestra el error y se sigue en el formulario', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, {}, () => ({
      status: 409,
      cuerpo: { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' } },
    }));

    await page.goto(rutaFormulario);
    await page.getByLabel('Nombre de la actividad').fill('Paseo');
    await page.getByRole('button', { name: 'Añadir al itinerario' }).click();

    await expect(page.getByRole('alert')).toHaveText('El viaje está cerrado y ya no se puede modificar');
    await expect(page).toHaveURL(new RegExp(`${rutaFormulario}$`));
  });

  test('un viaje archivado no deja añadir actividades', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { estado: 'archivado' });

    await page.goto(rutaFormulario);

    await expect(page.getByRole('alert')).toHaveText('El viaje está cerrado y ya no se pueden añadir actividades');
    await expect(page.getByLabel('Nombre de la actividad')).toHaveCount(0);
  });

  test('sin sesión se redirige al login', async ({ page }) => {
    await page.goto(rutaFormulario);

    await expect(page).toHaveURL(/\/login$/);
  });

  test('en un móvil de 390 px no hay scroll horizontal ni se sale el botón', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(rutaFormulario);
    const boton = page.getByRole('button', { name: 'Añadir al itinerario' });
    await expect(boton).toBeVisible();

    const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(ancho[0]).toBeLessThanOrEqual(ancho[1]);
    const caja = await boton.boundingBox();
    expect(caja!.x).toBeGreaterThanOrEqual(0);
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(390);
  });
});
