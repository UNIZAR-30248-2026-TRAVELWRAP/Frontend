import { test, expect, type Page, type Route } from '@playwright/test';

const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const VIAJE_ID = 'roma';
const ACTIVIDAD_ID = 'actividad-1';

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

const COLISEO = {
  nombre: 'Colosseo, Roma',
  titulo: 'Colosseo',
  detalle: 'Roma, Italia',
  latitud: 41.890214,
  longitud: 12.492231,
  lugar_externo_id: 'way/24146600',
};
const FORO = {
  nombre: 'Foro Romano, Roma',
  titulo: 'Foro Romano',
  detalle: 'Roma, Italia',
  latitud: 41.892462,
  longitud: 12.485325,
  lugar_externo_id: 'relation/5',
};

const etiqueta = (direccion: { titulo: string; detalle: string }) => `${direccion.titulo}, ${direccion.detalle}`;

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
  miembros: [
    { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
};

const actividadGuardada = () => ({
  id: ACTIVIDAD_ID,
  viaje_id: VIAJE_ID,
  titulo: 'Visita al Coliseo',
  descripcion: null,
  fecha: '2027-05-12',
  hora_inicio: null,
  hora_fin: null,
  orden: 0,
  ubicacion_nombre: COLISEO.nombre,
  latitud: COLISEO.latitud,
  longitud: COLISEO.longitud,
  lugar_externo_id: COLISEO.lugar_externo_id,
  categoria: null,
  creado_por: USUARIO_ID,
  creado_en: '2026-10-24T10:00:00Z',
  actualizado_en: '2026-10-24T10:00:00Z',
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

type Respuesta = { status: number; cuerpo: unknown };

const simularBackend = async (
  page: Page,
  respuestasBusqueda: Respuesta[] = [{ status: 200, cuerpo: { direcciones: [COLISEO, FORO] } }],
  actividades: unknown[] = [],
) => {
  const busquedas: { consulta: string | null; cabecera: string | undefined }[] = [];
  const creadas: Record<string, unknown>[] = [];
  const cambios: Record<string, unknown>[] = [];

  await page.route('**/api/direcciones**', (route) => {
    const peticion = route.request();
    busquedas.push({
      consulta: new URL(peticion.url()).searchParams.get('q'),
      cabecera: peticion.headers()['authorization'],
    });
    const { status, cuerpo } = respuestasBusqueda[Math.min(busquedas.length - 1, respuestasBusqueda.length - 1)];
    return json(route, status, cuerpo);
  });

  await page.route('**/api/viajes/**', (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    const metodo = peticion.method();

    if (ruta === `/viajes/${VIAJE_ID}/actividades` && metodo === 'GET') return json(route, 200, { actividades });
    if (ruta === `/viajes/${VIAJE_ID}/actividades` && metodo === 'POST') {
      const cuerpo = peticion.postDataJSON();
      creadas.push(cuerpo);
      return json(route, 201, { id: ACTIVIDAD_ID, ...cuerpo, orden: 0 });
    }
    if (ruta === `/viajes/${VIAJE_ID}/actividades/${ACTIVIDAD_ID}` && metodo === 'PATCH') {
      const cuerpo = peticion.postDataJSON();
      cambios.push(cuerpo);
      return json(route, 200, { ...actividadGuardada(), ...cuerpo });
    }
    return json(route, 200, viaje);
  });

  return { busquedas, creadas, cambios };
};

const rutaNueva = `/viajes/${VIAJE_ID}/actividades/nueva`;
const rutaEditar = `/viajes/${VIAJE_ID}/actividades/${ACTIVIDAD_ID}/editar`;

const buscarColosseo = async (page: Page) => {
  await page.getByLabel('Lugar / Dirección').fill('Colosseo');
  await page.getByRole('button', { name: 'Buscar dirección' }).click();
};

test.describe('Buscar la dirección de una actividad', () => {
  test('la lupa está desactivada hasta escribir tres caracteres y no se busca al teclear', async ({ page }) => {
    await entrarConSesion(page);
    const { busquedas } = await simularBackend(page);

    await page.goto(rutaNueva);
    const lupa = page.getByRole('button', { name: 'Buscar dirección' });
    await expect(lupa).toBeDisabled();
    await page.getByLabel('Lugar / Dirección').pressSequentially('Colosseo');
    await expect(lupa).toBeEnabled();
    await page.waitForTimeout(300);

    expect(busquedas).toHaveLength(0);
  });

  test('se busca con la lupa, se listan los resultados y se pide con la sesión', async ({ page }) => {
    await entrarConSesion(page);
    const { busquedas } = await simularBackend(page);

    await page.goto(rutaNueva);
    await page.getByLabel('Lugar / Dirección').fill('  Colosseo, Roma ');
    await page.getByRole('button', { name: 'Buscar dirección' }).click();

    const lista = page.getByRole('list', { name: 'Resultados de la búsqueda' });
    await expect(lista.getByRole('listitem')).toHaveCount(2);
    await expect(lista).toContainText(COLISEO.titulo);
    await expect(lista).toContainText(FORO.titulo);
    await expect(lista).toContainText(COLISEO.detalle);
    expect(busquedas).toEqual([{ consulta: 'Colosseo, Roma', cabecera: 'Bearer token-acceso' }]);
  });

  test('con Enter se busca sin guardar la actividad', async ({ page }) => {
    await entrarConSesion(page);
    const { busquedas, creadas } = await simularBackend(page);

    await page.goto(rutaNueva);
    await page.getByLabel('Nombre de la actividad').fill('Visita al Coliseo');
    await page.getByLabel('Lugar / Dirección').fill('Colosseo');
    await page.getByLabel('Lugar / Dirección').press('Enter');

    await expect(page.getByRole('list', { name: 'Resultados de la búsqueda' })).toBeVisible();
    expect(busquedas).toHaveLength(1);
    expect(creadas).toHaveLength(0);
    await expect(page).toHaveURL(/\/actividades\/nueva$/);
  });

  test('al elegir un resultado y guardar se envían las coordenadas', async ({ page }) => {
    await entrarConSesion(page);
    const { creadas } = await simularBackend(page);

    await page.goto(rutaNueva);
    await page.getByLabel('Nombre de la actividad').fill('Visita al Coliseo');
    await buscarColosseo(page);
    await page.getByRole('button', { name: etiqueta(COLISEO) }).click();

    await expect(page.getByLabel('Lugar / Dirección')).toHaveValue(COLISEO.nombre);
    await expect(page.getByText('Ubicación localizada en el mapa')).toBeVisible();
    await expect(page.getByRole('list', { name: 'Resultados de la búsqueda' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Añadir al itinerario' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma\/itinerario/);
    expect(creadas).toHaveLength(1);
    expect(creadas[0]).toMatchObject({
      titulo: 'Visita al Coliseo',
      ubicacion_nombre: COLISEO.nombre,
      latitud: 41.890214,
      longitud: 12.492231,
      lugar_externo_id: 'way/24146600',
    });
  });

  test('«Quitar» deja el texto del lugar sin coordenadas', async ({ page }) => {
    await entrarConSesion(page);
    const { creadas } = await simularBackend(page);

    await page.goto(rutaNueva);
    await page.getByLabel('Nombre de la actividad').fill('Visita al Coliseo');
    await buscarColosseo(page);
    await page.getByRole('button', { name: etiqueta(COLISEO) }).click();
    await page.getByRole('button', { name: 'Quitar' }).click();

    await expect(page.getByText('Ubicación localizada en el mapa')).toHaveCount(0);
    await expect(page.getByLabel('Lugar / Dirección')).toHaveValue(COLISEO.nombre);
    await page.getByRole('button', { name: 'Añadir al itinerario' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma\/itinerario/);
    expect(creadas[0]).toMatchObject({
      ubicacion_nombre: COLISEO.nombre,
      latitud: null,
      longitud: null,
      lugar_externo_id: null,
    });
  });

  test('si se cambia el texto después de elegir se pierden las coordenadas', async ({ page }) => {
    await entrarConSesion(page);
    const { creadas } = await simularBackend(page);

    await page.goto(rutaNueva);
    await page.getByLabel('Nombre de la actividad').fill('Visita al Coliseo');
    await buscarColosseo(page);
    await page.getByRole('button', { name: etiqueta(COLISEO) }).click();
    await page.getByLabel('Lugar / Dirección').pressSequentially(' (entrada norte)');

    await expect(page.getByText('Ubicación localizada en el mapa')).toHaveCount(0);
    await page.getByRole('button', { name: 'Añadir al itinerario' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma\/itinerario/);
    expect(creadas[0]).toMatchObject({ latitud: null, longitud: null, lugar_externo_id: null });
  });

  test('sin resultados avisa y se puede guardar el lugar como texto', async ({ page }) => {
    await entrarConSesion(page);
    const { creadas } = await simularBackend(page, [{ status: 200, cuerpo: { direcciones: [] } }]);

    await page.goto(rutaNueva);
    await page.getByLabel('Nombre de la actividad').fill('Cena');
    await page.getByLabel('Lugar / Dirección').fill('Trattoria sin nombre');
    await page.getByRole('button', { name: 'Buscar dirección' }).click();

    await expect(page.getByText(/No se han encontrado resultados/)).toBeVisible();
    await page.getByRole('button', { name: 'Añadir al itinerario' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma\/itinerario/);
    expect(creadas[0]).toMatchObject({ ubicacion_nombre: 'Trattoria sin nombre', latitud: null, longitud: null });
  });

  test('si se busca demasiado rápido (429) se muestra el aviso y se puede reintentar', async ({ page }) => {
    await entrarConSesion(page);
    const { busquedas } = await simularBackend(page, [
      {
        status: 429,
        cuerpo: { error: { codigo: 'demasiadas_busquedas', mensaje: 'Espera un segundo entre una búsqueda y otra' } },
      },
      { status: 200, cuerpo: { direcciones: [COLISEO] } },
    ]);

    await page.goto(rutaNueva);
    await buscarColosseo(page);

    await expect(page.getByRole('alert')).toHaveText('Espera un segundo entre una búsqueda y otra');
    await page.getByRole('button', { name: 'Buscar dirección' }).click();

    await expect(page.getByRole('list', { name: 'Resultados de la búsqueda' })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(busquedas).toHaveLength(2);
  });

  test('si falla el servicio de direcciones (502) se muestra el error y el formulario sigue disponible', async ({
    page,
  }) => {
    await entrarConSesion(page);
    await simularBackend(page, [
      {
        status: 502,
        cuerpo: { error: { codigo: 'error_geocodificacion', mensaje: 'No se ha podido buscar la dirección' } },
      },
    ]);

    await page.goto(rutaNueva);
    await page.getByLabel('Nombre de la actividad').fill('Visita al Coliseo');
    await buscarColosseo(page);

    await expect(page.getByRole('alert')).toHaveText('No se ha podido buscar la dirección');
    await expect(page.getByRole('button', { name: 'Añadir al itinerario' })).toBeEnabled();
  });

  test('al editar una actividad localizada se puede quitar la ubicación', async ({ page }) => {
    await entrarConSesion(page);
    const { cambios } = await simularBackend(page, undefined, [actividadGuardada()]);

    await page.goto(rutaEditar);
    await expect(page.getByLabel('Nombre de la actividad')).toHaveValue('Visita al Coliseo');
    await expect(page.getByText('Ubicación localizada en el mapa')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    await page.getByRole('button', { name: 'Quitar' }).click();
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma\/itinerario/);
    expect(cambios).toEqual([{ latitud: null, longitud: null, lugar_externo_id: null }]);
  });

  test('al editar una actividad se puede elegir otro lugar', async ({ page }) => {
    await entrarConSesion(page);
    const { cambios } = await simularBackend(page, undefined, [actividadGuardada()]);

    await page.goto(rutaEditar);
    await expect(page.getByLabel('Nombre de la actividad')).toHaveValue('Visita al Coliseo');
    await page.getByLabel('Lugar / Dirección').fill('Foro Romano');
    await page.getByRole('button', { name: 'Buscar dirección' }).click();
    await page.getByRole('button', { name: etiqueta(FORO) }).click();
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma\/itinerario/);
    expect(cambios).toEqual([
      { ubicacion_nombre: FORO.nombre, latitud: 41.892462, longitud: 12.485325, lugar_externo_id: 'relation/5' },
    ]);
  });
});
