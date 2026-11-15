import { test, expect, type Page, type Route } from '@playwright/test';

const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA_ID = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f';
const VIAJE_ID = 'roma';

const sesion = {
  usuario: { id: USUARIO_ID, nombre: 'Adriana', email: EMAIL, avatar_url: null, creado_en: '2026-10-06T15:29:32Z' },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

const viajeBase = {
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 850,
  estado: 'activo',
  archivado: false,
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'miembro',
  miembros: [
    { usuario_id: BERTA_ID, nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
};

type Tarea = {
  id: string;
  texto: string;
  hecha: boolean;
  hecha_en: string | null;
  creado_en: string;
  responsable: { usuario_id: string; nombre: string | null; avatar_url: string | null };
};

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

const nombreDe = (usuarioId: string) => viajeBase.miembros.find((m) => m.usuario_id === usuarioId)?.nombre ?? null;

// Backend simulado con las tareas en memoria, compartidas entre recargas de la página
const simularBackend = async (page: Page, { estado = 'activo', tareas = [] as Tarea[] } = {}) => {
  await page.route('**/api/viajes/**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    const partes = ruta.split('/');
    if (partes[1] === 'viajes' && partes[3] === 'tareas') {
      const tareaId = partes[4];
      if (!tareaId && peticion.method() === 'GET') return json(route, 200, { tareas });
      if (!tareaId && peticion.method() === 'POST') {
        const { texto, responsable_id: responsableId } = peticion.postDataJSON();
        const nueva: Tarea = {
          id: `t${tareas.length + 1}`,
          texto,
          hecha: false,
          hecha_en: null,
          creado_en: new Date().toISOString(),
          responsable: { usuario_id: responsableId, nombre: nombreDe(responsableId), avatar_url: null },
        };
        tareas.push(nueva);
        return json(route, 201, nueva);
      }
      const tarea = tareas.find((t) => t.id === tareaId);
      if (!tarea) return json(route, 404, { error: { codigo: 'tarea_no_encontrada', mensaje: 'La tarea no existe en este viaje' } });
      if (peticion.method() === 'PATCH') {
        const cambios = peticion.postDataJSON();
        if (cambios.texto !== undefined) tarea.texto = cambios.texto;
        if (cambios.responsable_id !== undefined) {
          tarea.responsable = { usuario_id: cambios.responsable_id, nombre: nombreDe(cambios.responsable_id), avatar_url: null };
        }
        if (cambios.hecha !== undefined) {
          tarea.hecha = cambios.hecha;
          tarea.hecha_en = cambios.hecha ? new Date().toISOString() : null;
        }
        return json(route, 200, tarea);
      }
      if (peticion.method() === 'DELETE') {
        tareas.splice(tareas.indexOf(tarea), 1);
        return route.fulfill({ status: 204 });
      }
    }
    if (partes[3] === 'documentos') return json(route, 200, { documentos: [] });
    return json(route, 200, { ...viajeBase, estado });
  });
  return tareas;
};

const abrirTareas = async (page: Page) => {
  await page.goto(`/viajes/${VIAJE_ID}/documentos?pestana=tareas`);
  await expect(page.getByText('Lista de Tareas', { exact: true })).toBeVisible();
};

const sinDesbordamiento = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('Lista de tareas colaborativa', () => {
  test('añade una tarea con responsable, la marca, la edita y la borra', async ({ page }) => {
    await entrarConSesion(page);
    const tareas = await simularBackend(page);
    await abrirTareas(page);
    await expect(page.getByText('Aún no hay tareas.')).toBeVisible();

    // Crear
    await page.getByRole('button', { name: 'Nueva' }).click();
    await page.getByLabel('Tarea', { exact: true }).fill('Reservar la cena');
    await page.getByLabel('Responsable', { exact: true }).selectOption({ label: 'Berta' });
    await page.getByRole('button', { name: 'Añadir' }).click();
    await expect(page.getByRole('checkbox', { name: 'Marcar Reservar la cena como hecha' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Responsable: Berta' })).toBeVisible();
    await expect(page.getByText('0/1')).toBeVisible();
    expect(tareas).toHaveLength(1);

    // Marcar y desmarcar
    const casilla = page.getByRole('checkbox', { name: 'Marcar Reservar la cena como hecha' });
    await casilla.click();
    await expect(casilla).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('¡Todo listo!')).toBeVisible();
    await casilla.click();
    await expect(casilla).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByText('1 tarea pendiente')).toBeVisible();

    // Editar
    await page.getByRole('button', { name: 'Editar Reservar la cena' }).click();
    await expect(page.getByLabel('Tarea', { exact: true })).toHaveValue('Reservar la cena');
    await page.getByLabel('Tarea', { exact: true }).fill('Reservar el almuerzo');
    await page.getByLabel('Responsable', { exact: true }).selectOption({ label: 'Adriana' });
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('checkbox', { name: 'Marcar Reservar el almuerzo como hecha' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Responsable: Adriana' })).toBeVisible();

    // Borrar con confirmación
    await page.getByRole('button', { name: 'Eliminar Reservar el almuerzo' }).click();
    await expect(page.getByRole('dialog')).toContainText('¿Eliminar esta tarea?');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
    expect(tareas).toHaveLength(1);
    await page.getByRole('button', { name: 'Eliminar Reservar el almuerzo' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar tarea' }).click();
    await expect(page.getByText('Aún no hay tareas.')).toBeVisible();
    expect(tareas).toHaveLength(0);
  });

  test('las tareas persisten al recargar y se puede cambiar entre las pestañas', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, {
      tareas: [
        { id: 't1', texto: 'Comprar entradas', hecha: true, hecha_en: '2027-05-02T09:00:00Z', creado_en: '2027-05-01T10:00:00Z', responsable: { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null } },
        { id: 't2', texto: 'Reservar la cena', hecha: false, hecha_en: null, creado_en: '2027-05-01T11:00:00Z', responsable: { usuario_id: BERTA_ID, nombre: 'Berta', avatar_url: null } },
      ],
    });
    await abrirTareas(page);
    await expect(page.getByText('1/2')).toBeVisible();
    await expect(page.getByText('50% completado')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('checkbox', { name: 'Marcar Comprar entradas como hecha' })).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('tab', { name: 'Cartera' }).click();
    await expect(page.getByRole('tab', { name: 'Cartera' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Cartera de Documentos')).toBeVisible();
    await page.getByRole('tab', { name: 'Lista de tareas' }).click();
    await expect(page.getByText('Lista de Tareas', { exact: true })).toBeVisible();
  });

  test('en un viaje finalizado la lista es de solo lectura', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, {
      estado: 'finalizado',
      tareas: [{ id: 't1', texto: 'Comprar entradas', hecha: false, hecha_en: null, creado_en: '2027-05-01T10:00:00Z', responsable: { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null } }],
    });
    await abrirTareas(page);

    await expect(page.getByText(/El viaje está finalizado: se pueden consultar sus tareas/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nueva' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Editar / })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Eliminar / })).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: 'Marcar Comprar entradas como hecha' })).toBeDisabled();
  });

  test('en móvil no hay scroll horizontal con un texto largo', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await entrarConSesion(page);
    await simularBackend(page, {
      tareas: [{ id: 't1', texto: 'Una tarea con un texto larguísimo '.repeat(5).trim(), hecha: false, hecha_en: null, creado_en: '2027-05-01T10:00:00Z', responsable: { usuario_id: BERTA_ID, nombre: 'Berta', avatar_url: null } }],
    });
    await abrirTareas(page);

    await expect(page.getByRole('list', { name: 'Tareas del viaje' })).toBeVisible();
    expect(await sinDesbordamiento(page)).toBe(true);
  });
});
