import { fileURLToPath } from 'node:url';
import { test, expect, type Page, type Route } from '@playwright/test';

const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const FOTO_PEQUENA = fileURLToPath(new URL('./archivos/avatar.png', import.meta.url));
// Portada que devuelve el servidor simulado: una imagen incrustada, para no depender de la red
const PORTADA =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

const sesion = {
  usuario: { id: USUARIO_ID, nombre: 'Adriana', email: 'adriana@travelwrap.app', avatar_url: null, creado_en: '2026-10-06T15:29:32Z' },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

type ViajeSimulado = Record<string, unknown> & { id: string; portada_url: string | null };

const viaje = (datos: Record<string, unknown> = {}): ViajeSimulado => ({
  id: 'roma',
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
  portada_url: null,
  rol: 'creador',
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

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

type Peticion = { metodo: string; ruta: string; tipo: string; cuerpo: string };

// Backend simulado con un viaje: la portada se guarda con PUT y se quita con DELETE, como en el real
const simularBackend = async (page: Page, inicial: ViajeSimulado, falloPortada?: { estado: number; codigo: string; mensaje: string }) => {
  const actual = inicial;
  const portadas: Peticion[] = [];

  await page.route('**/api/viajes**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    const metodo = peticion.method();

    if (ruta === '/viajes' && metodo === 'GET') return json(route, 200, { viajes: [actual] });
    if (ruta === `/viajes/${actual.id}/portada`) {
      portadas.push({
        metodo,
        ruta,
        tipo: peticion.headers()['content-type'] ?? '',
        cuerpo: peticion.postData() ?? '',
      });
      if (falloPortada) {
        return json(route, falloPortada.estado, { error: { codigo: falloPortada.codigo, mensaje: falloPortada.mensaje } });
      }
      actual.portada_url = metodo === 'PUT' ? PORTADA : null;
      return json(route, 200, actual);
    }
    if (ruta === `/viajes/${actual.id}` && metodo === 'PATCH') {
      Object.assign(actual, peticion.postDataJSON());
      return json(route, 200, actual);
    }
    return json(route, 200, actual);
  });

  return { portadas };
};

const portadaVisible = (page: Page) => page.getByTestId('fondo-portada');

test.describe('Foto de portada del viaje', () => {
  test('el creador elige una foto, se guarda al pulsar «Guardar cambios» y se ve en el inicio y en Mis viajes', async ({ page }) => {
    await entrarConSesion(page);
    const { portadas } = await simularBackend(page, viaje());

    await page.goto('/viajes/roma/editar');
    await expect(page.getByText('Añade una foto de portada')).toBeVisible();
    await page.getByLabel('Elegir foto de portada').setInputFiles(FOTO_PEQUENA);

    await expect(portadaVisible(page)).toBeVisible();
    expect(portadas).toHaveLength(0);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma$/);
    await expect(portadaVisible(page)).toHaveAttribute('src', PORTADA);
    expect(portadas).toHaveLength(1);
    expect(portadas[0].metodo).toBe('PUT');
    expect(portadas[0].tipo).toContain('multipart/form-data');
    expect(portadas[0].cuerpo).toContain('name="archivo"');

    await page.getByRole('button', { name: 'Volver a Mis Viajes' }).click();
    const tarjeta = page.getByRole('button', { name: /Roma 2027/ });
    await expect(tarjeta.getByTestId('fondo-portada')).toHaveAttribute('src', PORTADA);
  });

  test('sin portada el inicio y Mis viajes se ven como siempre', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, viaje());

    await page.goto('/viajes/roma');
    await expect(page.getByText('Roma', { exact: true })).toBeVisible();
    await expect(portadaVisible(page)).toHaveCount(0);

    await page.goto('/');
    await expect(page.getByRole('button', { name: /Roma 2027/ })).toBeVisible();
    await expect(portadaVisible(page)).toHaveCount(0);
  });

  test('el creador quita la portada y el viaje vuelve a su aspecto de siempre', async ({ page }) => {
    await entrarConSesion(page);
    const { portadas } = await simularBackend(page, viaje({ portada_url: PORTADA }));

    await page.goto('/viajes/roma/editar');
    await expect(portadaVisible(page)).toHaveAttribute('src', PORTADA);
    await page.getByRole('button', { name: 'Quitar foto' }).click();
    await expect(page.getByText('Añade una foto de portada')).toBeVisible();
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma$/);
    await expect(portadaVisible(page)).toHaveCount(0);
    expect(portadas.map((p) => p.metodo)).toEqual(['DELETE']);
  });

  test('una foto de otro tipo se rechaza con un mensaje y no se envía nada', async ({ page }) => {
    await entrarConSesion(page);
    const { portadas } = await simularBackend(page, viaje({ portada_url: PORTADA }));

    await page.goto('/viajes/roma/editar');
    await page.getByLabel('Elegir foto de portada').setInputFiles({
      name: 'animacion.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a'),
    });

    await expect(page.getByRole('alert')).toHaveText('La portada debe ser una foto JPEG o PNG');
    await expect(portadaVisible(page)).toHaveAttribute('src', PORTADA);
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(portadas).toHaveLength(0);
  });

  test('si el servidor la rechaza por grande muestra el error y se puede volver a intentar', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, viaje(), {
      estado: 400,
      codigo: 'archivo_demasiado_grande',
      mensaje: 'La portada no puede ocupar más de 5 MB',
    });

    await page.goto('/viajes/roma/editar');
    await page.getByLabel('Elegir foto de portada').setInputFiles(FOTO_PEQUENA);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByRole('alert')).toHaveText('La foto es demasiado grande (máximo 5 MB)');
    await expect(page).toHaveURL(/\/viajes\/roma\/editar$/);
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  });

  test('un miembro que no es el creador la ve y puede cambiarla, pero no edita los datos del viaje', async ({ page }) => {
    await entrarConSesion(page);
    const { portadas } = await simularBackend(page, viaje({ rol: 'miembro', portada_url: PORTADA }));

    await page.goto('/viajes/roma');
    await expect(portadaVisible(page)).toHaveAttribute('src', PORTADA);
    await expect(page.getByRole('button', { name: /Editar viaje/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Cambiar portada' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma\/editar$/);
    await expect(page.getByLabel('Nombre del viaje')).toHaveCount(0);
    await page.getByLabel('Elegir foto de portada').setInputFiles(FOTO_PEQUENA);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page).toHaveURL(/\/viajes\/roma$/);
    expect(portadas.map((p) => p.metodo)).toEqual(['PUT']);
  });

  test('en un viaje finalizado nadie puede cambiar la portada, pero se sigue viendo', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, viaje({ estado: 'finalizado', portada_url: PORTADA }));

    await page.goto('/viajes/roma');
    await expect(portadaVisible(page)).toHaveAttribute('src', PORTADA);
    await expect(page.getByRole('button', { name: 'Cambiar portada' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Editar viaje/ })).toHaveCount(0);
  });

  test('a 320 px no hay scroll horizontal ni con portada ni en el selector', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await entrarConSesion(page);
    await simularBackend(page, viaje({ portada_url: PORTADA }));
    const sinScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

    await page.goto('/');
    await expect(page.getByRole('button', { name: /Roma 2027/ })).toBeVisible();
    expect(await sinScroll()).toBe(true);

    await page.goto('/viajes/roma');
    await expect(portadaVisible(page)).toBeVisible();
    expect(await sinScroll()).toBe(true);

    await page.goto('/viajes/roma/editar');
    await expect(page.getByRole('button', { name: 'Cambiar foto' })).toBeVisible();
    expect(await sinScroll()).toBe(true);
  });
});
