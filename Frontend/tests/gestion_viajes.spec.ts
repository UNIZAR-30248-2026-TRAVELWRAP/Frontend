import { test, expect, type Page, type Route } from '@playwright/test';

const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';

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

type ViajeSimulado = ReturnType<typeof viaje>;

const viaje = (id: string, datos: Record<string, unknown> = {}) => ({
  id,
  nombre: `Viaje ${id}`,
  destino: 'Roma' as string | null,
  descripcion: null,
  fecha_inicio: '2027-05-12' as string | null,
  fecha_fin: '2027-05-15' as string | null,
  moneda: 'EUR',
  presupuesto: 850,
  estado: 'activo',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'creador',
  // Lo del propio usuario: archivar y eliminar son personales (los demás miembros no se ven afectados)
  archivado: false,
  miembros: [
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
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

const json = (route: Route, status: number, cuerpo?: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: cuerpo === undefined ? '' : JSON.stringify(cuerpo) });

// Backend de viajes simulado en memoria, con el archivado y la eliminación por usuario como el real:
// por defecto la lista solo trae los no archivados, `archivados=true` solo los archivados y un viaje eliminado
// desaparece (404). Solo se archiva un viaje finalizado y solo se elimina uno archivado
const simularBackendViajes = async (page: Page, iniciales: ViajeSimulado[]) => {
  const viajes = [...iniciales];
  const eliminados = new Set<string>();
  const peticiones: { metodo: string; ruta: string; cuerpo?: unknown }[] = [];

  await page.route('**/api/viajes**', async (route) => {
    const peticion = route.request();
    const url = new URL(peticion.url());
    const ruta = url.pathname.replace(/^.*\/api/, '');
    const metodo = peticion.method();
    peticiones.push({ metodo, ruta, cuerpo: peticion.postDataJSON() ?? undefined });

    if (ruta === '/viajes' && metodo === 'GET') {
      const estado = url.searchParams.get('estado');
      const archivados = url.searchParams.get('archivados') === 'true';
      return json(route, 200, {
        viajes: viajes.filter((v) => !eliminados.has(v.id) && (!estado || v.estado === estado) && v.archivado === archivados),
      });
    }

    const [, , id, accion] = ruta.split('/');
    const actual = viajes.find((v) => v.id === id);
    if (!actual || eliminados.has(actual.id)) {
      return json(route, 404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } });
    }

    if (accion === 'finalizar' && metodo === 'POST') {
      actual.estado = 'finalizado';
      return json(route, 200, actual);
    }
    if (accion === 'archivar' && metodo === 'POST') {
      if (actual.estado !== 'finalizado') {
        return json(route, 409, { error: { codigo: 'viaje_no_finalizado', mensaje: 'Solo se pueden archivar viajes finalizados' } });
      }
      actual.archivado = true;
      return json(route, 200, actual);
    }
    if (accion === 'desarchivar' && metodo === 'POST') {
      actual.archivado = false;
      return json(route, 200, actual);
    }
    if (!accion && metodo === 'PATCH') {
      Object.assign(actual, peticion.postDataJSON());
      return json(route, 200, actual);
    }
    if (!accion && metodo === 'DELETE') {
      if (!actual.archivado) {
        return json(route, 409, { error: { codigo: 'viaje_no_archivado', mensaje: 'Solo se pueden eliminar viajes archivados' } });
      }
      eliminados.add(actual.id);
      return route.fulfill({ status: 204 });
    }
    return json(route, 200, actual);
  });

  return { peticiones };
};

test.describe('Inicio del viaje y su gestión', () => {
  test('desde Mis viajes se abre el inicio del viaje con su barra inferior', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackendViajes(page, [viaje('roma', { nombre: 'Roma 2027', presupuesto: 1240 })]);

    await page.goto('/');
    await page.getByRole('button', { name: /Roma 2027/ }).click();

    await expect(page).toHaveURL(/\/viajes\/roma$/);
    await expect(page.getByText('Roma', { exact: true })).toBeVisible();
    await expect(page.getByText('1.240 €')).toBeVisible();
    const barra = page.getByRole('navigation', { name: 'Secciones del viaje' });
    await expect(barra.getByRole('button', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
    await expect(barra.getByRole('button', { name: 'Gastos' })).toBeEnabled();

    await page.getByRole('button', { name: 'Volver a Mis Viajes' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('el creador edita el viaje y el inicio muestra los datos nuevos', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackendViajes(page, [viaje('roma', { nombre: 'Roma 2027' })]);

    await page.goto('/viajes/roma');
    await page.getByRole('button', { name: /Editar viaje/ }).click();
    await expect(page).toHaveURL(/\/viajes\/roma\/editar$/);

    await page.getByLabel('Nombre del viaje').fill('Roma y Florencia');
    await page.getByLabel('Presupuesto total (€)').fill('1100');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma$/);
    await expect(page.getByText('Roma y Florencia')).toBeVisible();
    await expect(page.getByText('1.100 €')).toBeVisible();
    expect(peticiones.find((p) => p.metodo === 'PATCH')).toEqual({
      metodo: 'PATCH',
      ruta: '/viajes/roma',
      cuerpo: { nombre: 'Roma y Florencia', presupuesto: 1100 },
    });
  });

  test('finalizar el viaje lo deja en Viajes anteriores y de solo lectura', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackendViajes(page, [viaje('roma', { nombre: 'Roma 2027' })]);

    await page.goto('/viajes/roma');
    await page.getByRole('button', { name: 'Finalizar viaje' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('¿Finalizar este viaje?');
    await dialogo.getByRole('button', { name: 'Finalizar viaje' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Viajes anteriores')).toBeVisible();
    await expect(page.getByRole('button', { name: /Roma 2027/ })).toBeVisible();

    await page.goto('/viajes/roma');
    await expect(page.getByText(/Este viaje está finalizado/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Editar viaje/ })).toHaveCount(0);
  });

  test('un miembro que no es el creador archiva un viaje finalizado desde el final del wrap y va a Viajes archivados', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackendViajes(page, [
      viaje('roma', { nombre: 'Roma 2027', estado: 'finalizado', rol: 'miembro' }),
    ]);
    await page.route('**/api/viajes/roma/resumen', (route) =>
      json(route, 200, { dias: 4, gasto_total: 0, gasto_mayor: null, actividad_mas_votada: null, alma_del_grupo: null }),
    );
    await page.route('**/api/viajes/roma/fotos', (route) => json(route, 200, { fotos: [] }));
    await page.route('**/api/viajes/roma/balance', (route) => json(route, 200, { saldos: [] }));

    await page.goto('/viajes/roma/resumen');
    // Las teclas solo cuentan cuando el resumen ya ha cargado
    await expect(page.getByText('TravelWrap · Resumen')).toBeVisible();
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByText('Balance final', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Archivar viaje' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('¿Archivar este viaje?');
    await expect(dialogo).toContainText('solo en tu perfil');
    await dialogo.getByRole('button', { name: 'Archivar viaje' }).click();

    await expect(page).toHaveURL(/\/viajes\/archivados$/);
    await expect(page.getByRole('button', { name: 'Eliminar Roma 2027' })).toBeVisible();
    expect(peticiones.some((p) => p.metodo === 'POST' && p.ruta === '/viajes/roma/archivar')).toBe(true);
  });

  test('cancelar el cierre no finaliza el viaje', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackendViajes(page, [viaje('roma', { nombre: 'Roma 2027' })]);

    await page.goto('/viajes/roma');
    await page.getByRole('button', { name: 'Finalizar viaje' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/viajes\/roma$/);
    expect(peticiones.some((p) => p.ruta.endsWith('/finalizar'))).toBe(false);
  });

  test('un viaje archivado no sale en Mis viajes, solo en Viajes archivados', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackendViajes(page, [
      viaje('paris', { nombre: 'París 2024', estado: 'finalizado', archivado: true }),
      viaje('lisboa', { nombre: 'Lisboa 2023', estado: 'finalizado' }),
    ]);

    await page.goto('/');
    await expect(page.getByRole('button', { name: /Lisboa 2023/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /París 2024/ })).toHaveCount(0);

    await page.goto('/viajes/archivados');
    await expect(page.getByRole('button', { name: /^París 2024/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Lisboa 2023/ })).toHaveCount(0);
  });

  test('desde el perfil se llega a los archivados y cualquier miembro elimina un viaje para sí mismo', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackendViajes(page, [
      viaje('paris', { nombre: 'París 2024', estado: 'finalizado', archivado: true, rol: 'miembro' }),
      viaje('lisboa', { nombre: 'Lisboa 2023', estado: 'finalizado', archivado: true }),
    ]);

    await page.goto('/');
    await page.getByRole('button', { name: `Perfil de ${EMAIL}` }).click();
    await page.getByRole('button', { name: /Viajes archivados/ }).click();
    await expect(page).toHaveURL(/\/viajes\/archivados$/);
    await expect(page.getByText('2 viajes guardados')).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar París 2024' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('¿Eliminar este viaje para ti?');
    await dialogo.getByRole('button', { name: 'Eliminar viaje' }).click();

    await expect(page.getByText('París 2024')).toHaveCount(0);
    await expect(page.getByText('1 viaje guardado')).toBeVisible();
    expect(peticiones.filter((p) => p.metodo === 'DELETE').map((p) => p.ruta)).toEqual(['/viajes/paris']);

    // Para quien lo ha eliminado el viaje ya no existe
    await page.goto('/viajes/paris/resumen');
    await expect(page.getByText('TravelWrap · Resumen')).toHaveCount(0);
  });

  test('un miembro desarchiva un viaje, se queda en Viajes archivados y en Mis viajes vuelve a Viajes anteriores', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackendViajes(page, [
      viaje('paris', { nombre: 'París 2024', estado: 'finalizado', archivado: true, rol: 'miembro' }),
      viaje('lisboa', { nombre: 'Lisboa 2023', estado: 'finalizado', archivado: true }),
    ]);

    await page.goto('/viajes/archivados');
    await expect(page.getByRole('button', { name: 'Desarchivar Lisboa 2023' })).toBeVisible();
    await page.getByRole('button', { name: 'Desarchivar París 2024' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('¿Desarchivar este viaje?');
    await expect(dialogo).toContainText('volverá a Viajes anteriores, solo para ti');
    await dialogo.getByRole('button', { name: 'Desarchivar viaje' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/viajes\/archivados$/);
    await expect(page.getByRole('button', { name: /^París 2024/ })).toHaveCount(0);
    expect(peticiones.filter((p) => p.metodo === 'POST').map((p) => p.ruta)).toEqual(['/viajes/paris/desarchivar']);

    // Sigue finalizado: vuelve a «Viajes anteriores», nunca a «En curso», y no se puede editar
    await page.goto('/');
    await expect(page.getByText('Viajes anteriores')).toBeVisible();
    const tarjeta = page.getByRole('button', { name: /París 2024/ });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta).not.toContainText('En curso');
    await page.goto('/viajes/paris');
    await expect(page.getByText(/Este viaje está finalizado/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Editar viaje/ })).toHaveCount(0);
  });

  test('sin sesión el inicio de un viaje redirige al login', async ({ page }) => {
    await page.goto('/viajes/roma');

    await expect(page).toHaveURL(/\/login$/);
  });
});
