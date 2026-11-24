import { test, expect, type Page, type Route } from '@playwright/test';

const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const VIAJE_ID = 'roma';

const sesion = {
  usuario: { id: USUARIO_ID, nombre: 'Adriana', email: 'adriana@travelwrap.app', avatar_url: null, creado_en: '2026-10-06T15:29:32Z' },
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

const punto = (id: string, datos: Record<string, unknown> = {}) => ({
  id,
  viaje_id: VIAJE_ID,
  nombre: `Punto ${id}`,
  nota: null,
  categoria: null,
  latitud: 41.89,
  longitud: 12.49,
  lugar_externo_id: null,
  direccion: null,
  creado_por: USUARIO_ID,
  creado_en: '2026-11-22T10:00:00Z',
  ...datos,
});

const TREVI = punto('p1', {
  nombre: 'Fontana di Trevi',
  nota: 'Ir temprano para evitar colas',
  categoria: 'cultura',
  direccion: 'Fontana di Trevi, Piazza di Trevi, Roma',
  lugar_externo_id: 'way/24146600',
  latitud: 41.900932,
  longitud: 12.483313,
});
const HELADERIA = punto('p2', { nombre: 'Heladería Giolitti', categoria: 'comida', creado_por: 'u2', latitud: 41.9, longitud: 12.477 });
const MIRADOR = punto('p3', { nombre: 'Mirador del Gianicolo', latitud: 41.8916, longitud: 12.4614 });

const DIRECCION = {
  nombre: 'Pantheon, Piazza della Rotonda, Roma',
  titulo: 'Pantheon',
  detalle: 'Roma, Italia',
  latitud: 41.8986,
  longitud: 12.4769,
  lugar_externo_id: 'way/9',
};

const TESELA = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

type Opciones = {
  estado?: string;
  puntos?: Record<string, unknown>[];
  falloAlCrear?: boolean;
  direcciones?: unknown[];
};

const preparar = async (page: Page, { estado = 'activo', puntos = [TREVI, HELADERIA, MIRADOR], falloAlCrear = false, direcciones = [DIRECCION] }: Opciones = {}) => {
  let vigentes = [...puntos];
  const creados: Record<string, unknown>[] = [];
  const borrados: string[] = [];
  const peticionesDeTesela: string[] = [];
  const consultas: string[] = [];
  await page.addInitScript((datos) => {
    if (!sessionStorage.getItem('sesionSembrada')) {
      localStorage.setItem('travelwrap.sesion', JSON.stringify(datos));
      sessionStorage.setItem('sesionSembrada', '1');
    }
  }, sesion);
  await page.route('**/api/auth/refresh', (route) => json(route, 200, { token: sesion.token, refresh_token: sesion.refresh_token }));
  await page.route('https://tile.openstreetmap.org/**', (route) => {
    peticionesDeTesela.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'image/png', body: TESELA });
  });
  await page.route('**/api/direcciones**', (route) => {
    consultas.push(new URL(route.request().url()).searchParams.get('q') ?? '');
    return json(route, 200, { direcciones });
  });
  await page.route('**/api/viajes/**', (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    if (ruta === `/viajes/${VIAJE_ID}/puntos-de-interes`) {
      if (peticion.method() === 'POST') {
        if (falloAlCrear) {
          return json(route, 400, { error: { codigo: 'datos_invalidos', mensaje: 'La latitud es obligatoria y debe ser un número entre -90 y 90' } });
        }
        const cuerpo = peticion.postDataJSON();
        creados.push(cuerpo);
        const nuevo = punto(`nuevo-${creados.length}`, { nota: null, categoria: null, ...cuerpo });
        vigentes = [...vigentes, nuevo];
        return json(route, 201, nuevo);
      }
      return json(route, 200, { puntos_interes: vigentes });
    }
    if (ruta.startsWith(`/viajes/${VIAJE_ID}/puntos-de-interes/`) && peticion.method() === 'DELETE') {
      const id = ruta.split('/').pop() ?? '';
      borrados.push(id);
      vigentes = vigentes.filter((p) => p.id !== id);
      return route.fulfill({ status: 204 });
    }
    if (ruta === `/viajes/${VIAJE_ID}/actividades`) return json(route, 200, { actividades: [] });
    return json(route, 200, viaje({ estado }));
  });
  return { creados, borrados, peticionesDeTesela, consultas };
};

const abrirPuntos = async (page: Page) => {
  await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
  await page.getByRole('tab', { name: 'Puntos de interés' }).click();
  await expect(page.getByRole('tabpanel', { name: 'Puntos de interés' })).toBeVisible();
};

const mapa = (page: Page) => page.getByRole('region', { name: 'Mapa de los puntos de interés' });
const marcadores = (page: Page) => page.locator('.leaflet-marker-icon');
const filas = (page: Page) => page.getByRole('list', { name: 'Puntos de interés' }).getByRole('listitem');
const tocarMapa = (page: Page) => mapa(page).click({ position: { x: 60, y: 150 } });

test.describe('Itinerario · puntos de interés', () => {
  test('la pestaña enseña un mapa solo con los puntos y la lista debajo', async ({ page }) => {
    const { peticionesDeTesela } = await preparar(page);

    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    await expect(page.getByRole('tab', { name: 'Agenda', selected: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Puntos de interés' }).click();

    await expect(page.getByRole('tab', { name: 'Puntos de interés', selected: true })).toBeVisible();
    await expect(page.getByText('Agenda del día')).toHaveCount(0);
    await expect(marcadores(page)).toHaveCount(3);
    await expect(page.getByText('Puntos de interés (3)')).toBeVisible();
    await expect(filas(page)).toHaveCount(3);
    await expect(filas(page).first()).toContainText('Fontana di Trevi, Piazza di Trevi, Roma');
    await expect(filas(page).first()).toContainText('Ir temprano para evitar colas');
    expect(peticionesDeTesela.length).toBeGreaterThan(0);
    expect(peticionesDeTesela[0]).toMatch(/^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/);
  });

  test('la cabecera mide lo mismo en la agenda y en los puntos de interés', async ({ page }) => {
    await preparar(page);
    await page.goto(`/viajes/${VIAJE_ID}/itinerario`);
    const altoCabecera = () =>
      page.evaluate(async () => {
        await document.fonts.ready;
        return document.querySelector('[role=tablist]')?.parentElement?.getBoundingClientRect().height ?? 0;
      });
    await expect(page.getByText('Agenda del día')).toBeVisible();
    const enAgenda = await altoCabecera();

    await page.getByRole('tab', { name: 'Puntos de interés' }).click();
    await expect(marcadores(page)).toHaveCount(3);

    expect(await altoCabecera()).toBe(enAgenda);
  });

  test('tocar el mapa abre el panel con las coordenadas y guarda el punto sin dirección', async ({ page }) => {
    const { creados } = await preparar(page);
    await abrirPuntos(page);
    await expect(marcadores(page)).toHaveCount(3);

    await tocarMapa(page);

    const panel = page.getByRole('dialog', { name: 'Nuevo punto de interés' });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(/Sin dirección · \d+,\d{5}, \d+,\d{5}/);
    await expect(marcadores(page)).toHaveCount(4);
    await expect(panel.getByRole('button', { name: 'Guardar punto' })).toBeDisabled();

    await panel.getByLabel('Nombre del punto').fill('Heladería nueva');
    await panel.getByLabel('Nota (opcional)').fill('Muy buena');
    await panel.getByRole('button', { name: 'Comida' }).click();
    await panel.getByRole('button', { name: 'Guardar punto' }).click();

    await expect(page.getByRole('dialog', { name: 'Heladería nueva' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Nuevo punto de interés' })).toHaveCount(0);
    await expect(page.getByText('Puntos de interés (4)')).toBeVisible();
    expect(creados).toHaveLength(1);
    expect(creados[0]).toMatchObject({ nombre: 'Heladería nueva', nota: 'Muy buena', categoria: 'comida', lugar_externo_id: null, direccion: null });
    expect(typeof creados[0].latitud).toBe('number');
    expect(typeof creados[0].longitud).toBe('number');
  });

  test('buscar una dirección y elegirla coloca el punto y envía su dirección', async ({ page }) => {
    const { creados, consultas } = await preparar(page);
    await abrirPuntos(page);

    await page.getByLabel('Buscar una dirección').fill('Pantheon');
    await page.getByRole('button', { name: 'Buscar dirección' }).click();
    await page.getByRole('button', { name: 'Pantheon, Roma, Italia' }).click();

    const panel = page.getByRole('dialog', { name: 'Nuevo punto de interés' });
    await expect(panel).toContainText('Pantheon, Piazza della Rotonda, Roma');
    await expect(panel.getByLabel('Nombre del punto')).toHaveValue('Pantheon');
    await expect(page.getByRole('list', { name: 'Resultados de la búsqueda' })).toHaveCount(0);
    await panel.getByRole('button', { name: 'Guardar punto' }).click();

    await expect(page.getByRole('dialog', { name: 'Pantheon' })).toContainText('Pantheon, Piazza della Rotonda, Roma');
    expect(consultas).toEqual(['Pantheon']);
    expect(creados[0]).toMatchObject({
      nombre: 'Pantheon',
      latitud: 41.8986,
      longitud: 12.4769,
      lugar_externo_id: 'way/9',
      direccion: 'Pantheon, Piazza della Rotonda, Roma',
    });
  });

  test('la búsqueda sin resultados lo dice y no coloca nada', async ({ page }) => {
    await preparar(page, { direcciones: [] });
    await abrirPuntos(page);

    await page.getByLabel('Buscar una dirección').fill('lugar inventado');
    await page.getByRole('button', { name: 'Buscar dirección' }).click();

    await expect(page.getByText(/No se han encontrado resultados/)).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('cancelar el panel descarta la ubicación elegida', async ({ page }) => {
    const { creados } = await preparar(page);
    await abrirPuntos(page);
    await tocarMapa(page);
    await expect(marcadores(page)).toHaveCount(4);

    await page.getByRole('dialog', { name: 'Nuevo punto de interés' }).getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(marcadores(page)).toHaveCount(3);
    expect(creados).toHaveLength(0);
  });

  test('si el servidor rechaza el punto se avisa en el panel y no se pierde lo escrito', async ({ page }) => {
    await preparar(page, { falloAlCrear: true });
    await abrirPuntos(page);
    await tocarMapa(page);
    const panel = page.getByRole('dialog', { name: 'Nuevo punto de interés' });
    await panel.getByLabel('Nombre del punto').fill('Mirador');

    await panel.getByRole('button', { name: 'Guardar punto' }).click();

    await expect(panel.getByRole('alert')).toContainText('La latitud es obligatoria');
    await expect(panel.getByLabel('Nombre del punto')).toHaveValue('Mirador');
    await expect(page.getByText('Puntos de interés (3)')).toBeVisible();
  });





  test('la ficha y el panel quedan por encima de la barra inferior y no desbordan en 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await preparar(page);
    await abrirPuntos(page);
    await page.getByRole('button', { name: 'Ver Fontana di Trevi en el mapa' }).click();

    const ficha = page.getByRole('dialog', { name: 'Fontana di Trevi' });
    await expect(ficha).toBeVisible();
    const cajaFicha = await ficha.boundingBox();
    const cajaBarra = await page.getByRole('navigation', { name: 'Secciones del viaje' }).boundingBox();
    expect(cajaFicha && cajaBarra && cajaFicha.y + cajaFicha.height <= cajaBarra.y + 1).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const nombre of ['Cerrar ficha', 'Borrar']) {
      const caja = await ficha.getByRole('button', { name: nombre }).boundingBox();
      expect(caja && caja.height >= 44 - 1).toBe(true);
    }
  });




  test('sin puntos se explica cómo añadir el primero y no hay filtros', async ({ page }) => {
    await preparar(page, { puntos: [] });
    await abrirPuntos(page);

    await expect(page.getByText(/Todavía no hay puntos de interés en este viaje\. Toca el mapa o busca un sitio/)).toBeVisible();
    await expect(page.getByRole('group', { name: 'Filtrar por tipo' })).toHaveCount(0);
  });


});
