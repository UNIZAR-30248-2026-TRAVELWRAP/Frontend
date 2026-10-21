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

// Backend de viajes simulado en memoria
const simularBackendViajes = async (page: Page, iniciales: ViajeSimulado[]) => {
  const viajes = [...iniciales];
  const peticiones: { metodo: string; ruta: string; cuerpo?: unknown }[] = [];

  await page.route('**/api/viajes**', async (route) => {
    const peticion = route.request();
    const url = new URL(peticion.url());
    const ruta = url.pathname.replace(/^.*\/api/, '');
    const metodo = peticion.method();
    peticiones.push({ metodo, ruta, cuerpo: peticion.postDataJSON() ?? undefined });

    if (ruta === '/viajes' && metodo === 'GET') {
      const estado = url.searchParams.get('estado');
      return json(route, 200, { viajes: viajes.filter((v) => !estado || v.estado === estado) });
    }

    const [, , id, accion] = ruta.split('/');
    const actual = viajes.find((v) => v.id === id);
    if (!actual) return json(route, 404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } });

    if (accion === 'archivar' && metodo === 'POST') {
      actual.estado = 'archivado';
      return json(route, 200, actual);
    }
    if (!accion && metodo === 'PATCH') {
      Object.assign(actual, peticion.postDataJSON());
      return json(route, 200, actual);
    }
    if (!accion && metodo === 'DELETE') {
      viajes.splice(viajes.indexOf(actual), 1);
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
    await expect(barra.getByRole('button', { name: 'Gastos' })).toBeDisabled();

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

  test('cerrar el viaje lo archiva: sale de Mis viajes y queda de solo lectura', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackendViajes(page, [viaje('roma', { nombre: 'Roma 2027' })]);

    await page.goto('/viajes/roma');
    await page.getByRole('button', { name: 'Cerrar viaje' }).click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toContainText('¿Cerrar este viaje?');
    await dialogo.getByRole('button', { name: 'Cerrar viaje' }).click();

    await expect(page).toHaveURL(/\/viajes\/archivados$/);
    await page.getByRole('button', { name: /^Roma 2027/ }).click();
    await expect(page.getByText(/Este viaje está archivado/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Editar viaje/ })).toHaveCount(0);

    await page.goto('/');
    await expect(page.getByText('Aún no tienes viajes')).toBeVisible();
  });

  test('cancelar el cierre no archiva el viaje', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackendViajes(page, [viaje('roma', { nombre: 'Roma 2027' })]);

    await page.goto('/viajes/roma');
    await page.getByRole('button', { name: 'Cerrar viaje' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page).toHaveURL(/\/viajes\/roma$/);
    expect(peticiones.some((p) => p.ruta.endsWith('/archivar'))).toBe(false);
  });

  test('desde el perfil se llega a los archivados y se elimina un viaje', async ({ page }) => {
    await entrarConSesion(page);
    const { peticiones } = await simularBackendViajes(page, [
      viaje('paris', { nombre: 'París 2024', estado: 'archivado' }),
      viaje('lisboa', { nombre: 'Lisboa 2023', estado: 'archivado' }),
    ]);

    await page.goto('/');
    await page.getByRole('button', { name: `Perfil de ${EMAIL}` }).click();
    await page.getByRole('button', { name: /Viajes archivados/ }).click();
    await expect(page).toHaveURL(/\/viajes\/archivados$/);
    await expect(page.getByText('2 viajes guardados')).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar París 2024' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar viaje' }).click();

    await expect(page.getByText('París 2024')).toHaveCount(0);
    await expect(page.getByText('1 viaje guardado')).toBeVisible();
    expect(peticiones.filter((p) => p.metodo === 'DELETE').map((p) => p.ruta)).toEqual(['/viajes/paris']);
  });

  test('sin sesión el inicio de un viaje redirige al login', async ({ page }) => {
    await page.goto('/viajes/roma');

    await expect(page).toHaveURL(/\/login$/);
  });
});
