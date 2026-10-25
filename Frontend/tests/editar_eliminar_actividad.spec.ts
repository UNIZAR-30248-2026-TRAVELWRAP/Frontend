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

type ActividadSimulada = ReturnType<typeof actividad>;

const actividad = (id: string, datos: Record<string, unknown> = {}) => ({
  id,
  viaje_id: VIAJE_ID,
  titulo: `Actividad ${id}`,
  descripcion: null,
  fecha: '2027-05-12',
  hora_inicio: null as string | null,
  hora_fin: null as string | null,
  orden: 0,
  ubicacion_nombre: null as string | null,
  latitud: null,
  longitud: null,
  lugar_externo_id: null,
  categoria: null as string | null,
  creado_por: null as string | null,
  creado_en: '2026-10-24T10:00:00Z',
  actualizado_en: '2026-10-24T10:00:00Z',
  ...datos,
});

const ACTIVIDADES = [
  actividad('desayuno', { titulo: 'Desayuno', hora_inicio: '08:30:00', ubicacion_nombre: 'Hotel', categoria: 'comida' }),
  actividad('coliseo', { titulo: 'Visita al Coliseo', hora_inicio: '10:00:00', hora_fin: '12:00:00', ubicacion_nombre: 'Piazza del Colosseo', categoria: 'cultura' }),
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

const conSegundos = (hora: unknown) => (typeof hora === 'string' && hora.length === 5 ? `${hora}:00` : hora);

const RECHAZO = { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' } };

const simularBackend = async (
  page: Page,
  { datosViaje = {}, rechazaCambios = false }: { datosViaje?: Record<string, unknown>; rechazaCambios?: boolean } = {},
) => {
  const actividades = ACTIVIDADES.map((a) => ({ ...a }));
  const peticiones: { metodo: string; id: string; cuerpo?: Record<string, unknown> }[] = [];

  await page.route('**/api/viajes/**', async (route) => {
    const peticion = route.request();
    const partes = new URL(peticion.url()).pathname.replace(/^.*\/api/, '').split('/');
    const metodo = peticion.method();

    if (partes[3] === 'actividades' && partes[4]) {
      const id = partes[4];
      peticiones.push({ metodo, id, cuerpo: peticion.postDataJSON() ?? undefined });
      if (rechazaCambios) return json(route, 409, RECHAZO);
      const indice = actividades.findIndex((a) => a.id === id);
      if (indice < 0) {
        return json(route, 404, { error: { codigo: 'actividad_no_encontrada', mensaje: 'La actividad no existe en este viaje' } });
      }
      if (metodo === 'DELETE') {
        actividades.splice(indice, 1);
        return route.fulfill({ status: 204 });
      }
      const cambios = peticion.postDataJSON() as Record<string, unknown>;
      Object.assign(actividades[indice], cambios, {
        hora_inicio: 'hora_inicio' in cambios ? conSegundos(cambios.hora_inicio) : actividades[indice].hora_inicio,
        hora_fin: 'hora_fin' in cambios ? conSegundos(cambios.hora_fin) : actividades[indice].hora_fin,
      });
      return json(route, 200, actividades[indice]);
    }
    if (partes[3] === 'actividades') return json(route, 200, { actividades: ordenarComoElBackend(actividades) });
    return json(route, 200, viaje(datosViaje));
  });

  return { peticiones };
};

const agenda = (page: Page) => page.getByRole('list', { name: 'Agenda del día' }).getByRole('listitem');
const urlItinerario = (fecha: string) => new RegExp(`/viajes/${VIAJE_ID}/itinerario\\?fecha=${fecha}$`);

test.describe('Itinerario · editar una actividad', () => {
  test('el lápiz abre el formulario con los datos de la actividad y al guardar la agenda se actualiza', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await page.getByRole('button', { name: 'Editar Visita al Coliseo' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/actividades/coliseo/editar\\?fecha=2027-05-12$`));
    await expect(page.getByText('Editar Actividad')).toBeVisible();
    await expect(page.getByLabel('Nombre de la actividad')).toHaveValue('Visita al Coliseo');
    await expect(page.getByLabel('Lugar / Dirección')).toHaveValue('Piazza del Colosseo');
    await expect(page.getByLabel('Hora', { exact: true })).toHaveValue('10:00');
    await expect(page.getByLabel('Hasta (opcional)')).toHaveValue('12:00');
    await expect(page.getByRole('button', { name: 'Cultura' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();

    await page.getByLabel('Nombre de la actividad').fill('Coliseo y Foro');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(urlItinerario('2027-05-12'));
    await expect(agenda(page)).toHaveText(['DesayunoHotel08:30 h', 'Coliseo y ForoPiazza del Colosseo10:00 – 12:00 h']);
    expect(peticiones).toEqual([{ metodo: 'PATCH', id: 'coliseo', cuerpo: { titulo: 'Coliseo y Foro' } }]);
  });

  test('al cambiar una actividad de día el Itinerario se abre en el día nuevo', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await page.getByRole('button', { name: 'Editar Visita al Coliseo' }).click();
    await page.getByRole('button', { name: 'Día 2 · 13 may' }).click();
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(urlItinerario('2027-05-13'));
    await expect(page.getByRole('button', { name: 'Día 2 · 13 may' })).toHaveAttribute('aria-pressed', 'true');
    await expect(agenda(page)).toHaveText(['Vaticano09:30 h', 'Visita al ColiseoPiazza del Colosseo10:00 – 12:00 h']);
    expect(peticiones[0].cuerpo).toEqual({ fecha: '2027-05-13' });
    await page.getByRole('button', { name: 'Día 1 · 12 may' }).click();
    await expect(agenda(page)).toHaveText(['DesayunoHotel08:30 h']);
  });

  test('quitar la hora y el lugar los hace desaparecer de la tarjeta', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await page.getByRole('button', { name: 'Editar Visita al Coliseo' }).click();
    await page.getByLabel('Hora', { exact: true }).fill('');
    await page.getByLabel('Lugar / Dirección').fill('');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(urlItinerario('2027-05-12'));
    await expect(agenda(page)).toHaveText(['DesayunoHotel08:30 h', 'Visita al Coliseo']);
    expect(peticiones[0].cuerpo).toEqual({ hora_inicio: null, hora_fin: null, ubicacion_nombre: null });
  });

  test('la flecha de volver regresa al día desde el que se entró sin guardar nada', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await page.getByRole('button', { name: 'Día 2 · 13 may' }).click();
    await page.getByRole('button', { name: 'Editar Vaticano' }).click();
    await page.getByLabel('Nombre de la actividad').fill('Vaticano y Sixtina');
    await page.getByRole('button', { name: 'Volver' }).click();

    await expect(page).toHaveURL(urlItinerario('2027-05-13'));
    await expect(agenda(page)).toHaveText(['Vaticano09:30 h']);
    expect(peticiones).toHaveLength(0);
  });

  test('una hora de fin anterior a la de inicio avisa y bloquea el guardado', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/actividades/coliseo/editar?fecha=2027-05-12`);
    await page.getByLabel('Hasta (opcional)').fill('09:00');

    await expect(page.getByRole('alert')).toHaveText('La hora de fin no puede ser anterior a la de inicio');
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(peticiones).toHaveLength(0);
  });

  test('si el servidor rechaza el cambio se muestra el error y se sigue en el formulario', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { rechazaCambios: true });

    await page.goto(`/viajes/${VIAJE_ID}/actividades/coliseo/editar?fecha=2027-05-12`);
    await page.getByLabel('Nombre de la actividad').fill('Otro nombre');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByRole('alert')).toHaveText('El viaje está cerrado y ya no se puede modificar');
    await expect(page).toHaveURL(/\/actividades\/coliseo\/editar/);
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  });

  test('una actividad que no existe lo avisa y no ofrece el formulario', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/actividades/no-existe/editar`);

    await expect(page.getByRole('alert')).toContainText('La actividad no existe en este viaje');
    await expect(page.getByLabel('Nombre de la actividad')).toHaveCount(0);
  });

  test('en un viaje archivado no hay botones y la pantalla de edición no deja modificar', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { datosViaje: { estado: 'archivado' } });

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(agenda(page)).toHaveCount(2);
    await expect(page.getByRole('button', { name: /^Editar / })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Eliminar / })).toHaveCount(0);

    await page.goto(`/viajes/${VIAJE_ID}/actividades/coliseo/editar`);
    await expect(page.getByRole('alert')).toHaveText('El viaje está cerrado y ya no se pueden modificar actividades');
    await expect(page.getByLabel('Nombre de la actividad')).toHaveCount(0);
  });

  test('sin sesión la pantalla de edición redirige al login', async ({ page }) => {
    await page.goto(`/viajes/${VIAJE_ID}/actividades/coliseo/editar`);

    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Itinerario · eliminar una actividad', () => {
  test('la papelera pide confirmación y cancelar no elimina nada', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await page.getByRole('button', { name: 'Eliminar Visita al Coliseo' }).click();

    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('¿Eliminar esta actividad?');
    await expect(dialogo).toContainText('Visita al Coliseo');
    await dialogo.getByRole('button', { name: 'Cancelar' }).click();

    await expect(dialogo).toHaveCount(0);
    await expect(agenda(page)).toHaveCount(2);
    expect(peticiones).toHaveLength(0);
  });

  test('confirmar elimina la actividad y la agenda se actualiza al momento', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await page.getByRole('button', { name: 'Eliminar Visita al Coliseo' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar actividad' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(agenda(page)).toHaveText(['DesayunoHotel08:30 h']);
    expect(peticiones).toEqual([{ metodo: 'DELETE', id: 'coliseo' }]);

    await page.reload();
    await expect(agenda(page)).toHaveText(['DesayunoHotel08:30 h']);
  });

  test('al eliminar la última actividad de un día se indica que no hay ninguna', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario?fecha=2027-05-13`);
    await page.getByRole('button', { name: 'Eliminar Vaticano' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar actividad' }).click();

    await expect(page.getByText('No hay actividades este día.')).toBeVisible();
  });

  test('si el servidor rechaza el borrado se muestra el error en el diálogo y la actividad sigue', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { rechazaCambios: true });

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await page.getByRole('button', { name: 'Eliminar Visita al Coliseo' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar actividad' }).click();

    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText('El viaje está cerrado y ya no se puede modificar');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
    await expect(agenda(page)).toHaveCount(2);
  });

  test('sin conexión se ve lo guardado pero no hay botones de editar ni eliminar', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(page.getByRole('button', { name: 'Editar Visita al Coliseo' })).toBeVisible();
    await page.route('**/api/**', (route) => route.abort('internetdisconnected'));
    await page.reload();

    await expect(agenda(page)).toHaveCount(2);
    await expect(page.getByRole('button', { name: /^Editar / })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Eliminar / })).toHaveCount(0);
  });
});

test.describe('Itinerario · editar y eliminar en móvil', () => {
  for (const ancho of [320, 390]) {
    test(`a ${ancho} px los botones caben en la tarjeta y no hay scroll horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 844 });
      await entrarConSesion(page);
      await simularBackend(page);

      await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
      await expect(agenda(page)).toHaveCount(2);

      const medidas = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(medidas[0]).toBeLessThanOrEqual(medidas[1]);
      for (const nombre of ['Editar Visita al Coliseo', 'Eliminar Visita al Coliseo']) {
        const caja = await page.getByRole('button', { name: nombre }).boundingBox();
        expect(caja!.x).toBeGreaterThanOrEqual(0);
        expect(caja!.x + caja!.width).toBeLessThanOrEqual(ancho);
        expect(caja!.width).toBeGreaterThanOrEqual(28);
      }
    });
  }
});
