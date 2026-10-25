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
  fecha_fin: '2027-05-14' as string | null,
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

type ActividadSimulada = ReturnType<typeof actividad>;

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
  latitud: null,
  longitud: null,
  lugar_externo_id: null,
  categoria: null,
  creado_por: USUARIO_ID,
  creado_en: '2026-10-24T10:00:00Z',
  actualizado_en: '2026-10-24T10:00:00Z',
  ...datos,
});

const ACTIVIDADES = [
  actividad('desayuno', { titulo: 'Desayuno', hora_inicio: '08:30:00', ubicacion_nombre: 'Hotel' }),
  actividad('coliseo', { titulo: 'Visita al Coliseo', hora_inicio: '10:00:00', ubicacion_nombre: 'Piazza del Colosseo' }),
  actividad('paseo', { titulo: 'Paseo sin hora' }),
  actividad('vaticano', { titulo: 'Vaticano', fecha: '2027-05-13', hora_inicio: '09:30:00' }),
];

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

const ordenarComoElBackend = (lista: ActividadSimulada[]) =>
  [...lista].sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      (a.hora_inicio === null ? 1 : 0) - (b.hora_inicio === null ? 1 : 0) ||
      (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''),
  );

const simularBackend = async (
  page: Page,
  datosViaje: Record<string, unknown> = {},
  iniciales: ActividadSimulada[] = ACTIVIDADES,
  fallaElListado = false,
) => {
  const actividades = [...iniciales];

  await page.route('**/api/viajes/**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');

    if (ruta === `/viajes/${VIAJE_ID}/actividades`) {
      if (peticion.method() === 'POST') {
        const cuerpo = peticion.postDataJSON();
        const nueva = actividad(`nueva-${actividades.length}`, {
          ...cuerpo,
          hora_inicio: cuerpo.hora_inicio ? `${cuerpo.hora_inicio}:00` : null,
        });
        actividades.push(nueva);
        return json(route, 201, nueva);
      }
      if (fallaElListado) {
        return json(route, 502, { error: { codigo: 'error_actividad', mensaje: 'No se han podido obtener las actividades' } });
      }
      return json(route, 200, { actividades: ordenarComoElBackend(actividades) });
    }
    return json(route, 200, viaje(datosViaje));
  });
};

const agenda = (page: Page) => page.getByRole('list', { name: 'Agenda del día' }).getByRole('listitem');

test.describe('Itinerario · agenda del día', () => {
  test('desde el inicio del viaje, la pestaña Itinerario muestra las actividades del primer día ordenadas por hora', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}`);
    await page.getByRole('navigation', { name: 'Secciones del viaje' }).getByRole('button', { name: 'Itinerario' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/itinerario$`));
    await expect(page.getByRole('button', { name: 'Día 1 · 12 may' })).toHaveAttribute('aria-pressed', 'true');
    await expect(agenda(page)).toHaveText([
      'DesayunoHotel08:30 h',
      'Visita al ColiseoPiazza del Colosseo10:00 h',
      'Paseo sin hora',
    ]);
    await expect(
      page.getByRole('navigation', { name: 'Secciones del viaje' }).getByRole('button', { name: 'Itinerario' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('al elegir otro día se muestran solo sus actividades', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(agenda(page)).toHaveCount(3);
    await page.getByRole('button', { name: 'Día 2 · 13 may' }).click();

    await expect(agenda(page)).toHaveText(['Vaticano09:30 h']);
    await page.getByRole('button', { name: 'Día 3 · 14 may' }).click();
    await expect(page.getByText('No hay actividades este día.')).toBeVisible();
  });

  test('una actividad nueva aparece en su día al volver del formulario', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await page.getByRole('button', { name: 'Añadir Actividad' }).click();
    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/actividades/nueva$`));
    await page.getByRole('button', { name: 'Día 3 · 14 may' }).click();
    await page.getByLabel('Nombre de la actividad').fill('Vuelta a casa');
    await page.getByLabel('Hora').fill('18:00');
    await page.getByRole('button', { name: 'Añadir al itinerario' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/itinerario$`));
    await page.getByRole('button', { name: 'Día 3 · 14 may' }).click();
    await expect(agenda(page)).toHaveText(['Vuelta a casa18:00 h']);
  });

  test('con un viaje sin fechas, los días salen de las actividades', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { fecha_inicio: null, fecha_fin: null }, [
      actividad('playa', { titulo: 'Playa', fecha: '2027-06-02' }),
      actividad('museo', { titulo: 'Museo', fecha: '2027-06-01' }),
    ]);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(page.getByRole('group', { name: 'Día del itinerario' }).getByRole('button')).toHaveText(['1 jun', '2 jun']);
    await expect(agenda(page)).toHaveText(['Museo']);
    await page.getByRole('button', { name: '2 jun' }).click();
    await expect(agenda(page)).toHaveText(['Playa']);
  });

  test('un viaje archivado se consulta pero no deja añadir actividades', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { estado: 'archivado' });

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(agenda(page)).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Añadir Actividad' })).toHaveCount(0);
  });

  test('si el servidor falla al listar se muestra el error', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, {}, ACTIVIDADES, true);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(page.getByRole('alert')).toContainText('No se han podido obtener las actividades');
    await expect(page.getByRole('button', { name: 'Añadir Actividad' })).toHaveCount(0);
  });

  test('la pestaña Inicio vuelve al inicio del viaje', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await page.getByRole('navigation', { name: 'Secciones del viaje' }).getByRole('button', { name: 'Inicio' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}$`));
  });

  test('sin sesión se redirige al login', async ({ page }) => {
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);

    await expect(page).toHaveURL(/\/login$/);
  });

  test('en un móvil de 390 px no hay scroll horizontal con muchos días y textos largos', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await entrarConSesion(page);
    await simularBackend(page, { fecha_fin: '2027-05-25' }, [
      actividad('larga', {
        titulo: 'Visita guiada muy larga por todo el foro imperial y los alrededores del Coliseo',
        hora_inicio: '10:00:00',
        ubicacion_nombre: 'Piazza del Colosseo, Roma, Italia, frente a la entrada principal del monumento',
      }),
    ]);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(agenda(page)).toHaveCount(1);

    const ancho = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(ancho[0]).toBeLessThanOrEqual(ancho[1]);
    const caja = await agenda(page).first().boundingBox();
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(390);
  });
});
