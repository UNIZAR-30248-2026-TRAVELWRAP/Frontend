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
  rol: 'miembro',
  miembros: [
    { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
};

const COLISEO = {
  nombre: 'Colosseo, Roma',
  titulo: 'Colosseo',
  detalle: 'Roma, Italia',
  latitud: 41.890214,
  longitud: 12.492231,
  lugar_externo_id: 'way/24146600',
};

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
  latitud: null as number | null,
  longitud: null as number | null,
  lugar_externo_id: null as string | null,
  categoria: null,
  creado_por: null as string | null,
  creado_en: '2026-10-24T10:00:00Z',
  actualizado_en: '2026-10-24T10:00:00Z',
  ...datos,
});

const FORO = actividad('foro', {
  titulo: 'Foro Romano',
  hora_inicio: '12:00:00',
  ubicacion_nombre: 'Foro Romano, Roma',
  latitud: 41.892462,
  longitud: 12.485325,
});

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const ordenadas = (lista: ActividadSimulada[]) =>
  [...lista].sort(
    (a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      (a.hora_inicio === null ? 1 : 0) - (b.hora_inicio === null ? 1 : 0) ||
      (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''),
  );

const prepararServidor = async (page: Page, iniciales: ActividadSimulada[]) => {
  const servidor = { actividades: iniciales.map((a) => ({ ...a })), listados: 0 };
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
  await page.route('**/api/direcciones**', (route) => json(route, 200, { direcciones: [COLISEO] }));
  await page.route('**/api/viajes/**', (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    const metodo = peticion.method();
    const coleccion = `/viajes/${VIAJE_ID}/actividades`;

    if (ruta === coleccion && metodo === 'GET') {
      servidor.listados += 1;
      return json(route, 200, { actividades: ordenadas(servidor.actividades) });
    }
    if (ruta === coleccion && metodo === 'POST') {
      const cuerpo = peticion.postDataJSON();
      const nueva = actividad(`nueva-${servidor.actividades.length}`, {
        ...cuerpo,
        hora_inicio: cuerpo.hora_inicio ? `${cuerpo.hora_inicio}:00` : null,
      });
      servidor.actividades.push(nueva);
      return json(route, 201, nueva);
    }
    if (ruta.startsWith(`${coleccion}/`)) {
      const id = ruta.split('/').pop();
      const actual = servidor.actividades.find((a) => a.id === id);
      if (!actual) return json(route, 404, { error: { codigo: 'actividad_no_encontrada', mensaje: 'No existe' } });
      if (metodo === 'PATCH') {
        Object.assign(actual, peticion.postDataJSON());
        return json(route, 200, actual);
      }
      if (metodo === 'DELETE') {
        servidor.actividades = servidor.actividades.filter((a) => a.id !== id);
        return route.fulfill({ status: 204 });
      }
    }
    return json(route, 200, viaje);
  });
  return servidor;
};

const agenda = (page: Page) => page.getByRole('list', { name: 'Agenda del día' }).getByRole('listitem');
const marcadores = (page: Page) => page.locator('.leaflet-marker-icon');

test.describe('Itinerario · la agenda y el mapa se recargan', () => {
  test('una actividad añadida con su ubicación aparece en la agenda y como marcador al volver', async ({ page }) => {
    await prepararServidor(page, [FORO]);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(marcadores(page)).toHaveCount(1);

    await page.getByRole('button', { name: 'Añadir Actividad' }).click();
    await page.getByLabel('Nombre de la actividad').fill('Visita al Coliseo');
    await page.getByLabel('Hora', { exact: true }).fill('10:00');
    await page.getByLabel('Lugar / Dirección').fill('Colosseo');
    await page.getByRole('button', { name: 'Buscar dirección' }).click();
    await page.getByRole('button', { name: `${COLISEO.titulo}, ${COLISEO.detalle}` }).click();
    await page.getByRole('button', { name: 'Añadir al itinerario' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma\/itinerario/);
    await expect(agenda(page)).toHaveCount(2);
    await expect(marcadores(page)).toHaveCount(2);
    await expect(page.getByRole('button', { name: '1. Visita al Coliseo' })).toBeVisible();
    await expect(page.getByRole('button', { name: '2. Foro Romano' })).toBeVisible();
    await expect(page.getByText('2 de 2 actividades con ubicación en el mapa')).toBeVisible();
  });

  test('al quitar la ubicación de una actividad su marcador desaparece al volver', async ({ page }) => {
    await prepararServidor(page, [FORO]);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(marcadores(page)).toHaveCount(1);

    await page.getByRole('button', { name: 'Editar Foro Romano' }).click();
    await page.getByRole('button', { name: 'Quitar' }).click();
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma\/itinerario/);
    await expect(agenda(page)).toHaveCount(1);
    await expect(marcadores(page)).toHaveCount(0);
    await expect(page.getByText(/Ninguna actividad de este día tiene ubicación en el mapa/)).toBeVisible();
  });

  test('al eliminar una actividad desaparece de la agenda y su marcador, y se renumeran los demás', async ({ page }) => {
    const coliseo = actividad('coliseo', {
      titulo: 'Visita al Coliseo',
      hora_inicio: '10:00:00',
      ubicacion_nombre: COLISEO.nombre,
      latitud: COLISEO.latitud,
      longitud: COLISEO.longitud,
    });
    await prepararServidor(page, [coliseo, FORO]);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(marcadores(page)).toHaveCount(2);

    await page.getByRole('button', { name: 'Eliminar Visita al Coliseo' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar actividad' }).click();

    await expect(agenda(page)).toHaveCount(1);
    await expect(marcadores(page)).toHaveCount(1);
    await expect(page.getByRole('button', { name: '1. Foro Romano' })).toBeVisible();
    await expect(page.getByText('1 de 1 actividad con ubicación en el mapa')).toBeVisible();
  });

  test('tras eliminar se vuelve a pedir el listado y aparece lo que otro miembro haya añadido mientras tanto', async ({ page }) => {
    const servidor = await prepararServidor(page, [FORO, actividad('paseo', { titulo: 'Paseo sin hora' })]);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(agenda(page)).toHaveCount(2);
    const listadosAntes = servidor.listados;
    servidor.actividades.push(
      actividad('otro', {
        titulo: 'Plan de Berta',
        hora_inicio: '18:00:00',
        ubicacion_nombre: 'Trastevere',
        latitud: 41.889,
        longitud: 12.47,
      }),
    );

    await page.getByRole('button', { name: 'Eliminar Paseo sin hora' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar actividad' }).click();

    await expect(agenda(page)).toHaveText([/^Foro Romano/, /^Plan de Berta/]);
    await expect(marcadores(page)).toHaveCount(2);
    expect(servidor.listados).toBe(listadosAntes + 1);
  });
});
