import { test, expect, type Page, type Route } from '@playwright/test';

const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA_ID = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f';
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
    { usuario_id: BERTA_ID, nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
};

const documentoExistente = {
  id: 'doc-1',
  viaje_id: VIAJE_ID,
  nombre: 'Reserva del hotel.pdf',
  tipo_mime: 'application/pdf',
  tamano_bytes: 248731,
  subido_por: BERTA_ID,
  creado_en: '2026-11-08T10:00:00Z',
};

// PDF mínimo de prueba, en memoria
const PDF = { name: 'billete.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%billete de prueba') };

// Sesión guardada como la deja el login, solo en la primera carga de la página
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

type Subida = { cabecera: string | undefined; tipo: string | undefined; cuerpo: string };

// Backend simulado: el viaje, su lista de documentos y POST /documentos con la respuesta indicada.
// Devuelve las subidas recibidas para comprobar qué ha enviado la pantalla
const simularBackend = async (
  page: Page,
  {
    estado = 'activo',
    respuestaSubida,
  }: { estado?: string; respuestaSubida?: (nombre: string) => { status: number; cuerpo: unknown } } = {},
) => {
  const recibidas: Subida[] = [];
  const subidos: unknown[] = [];
  const respuesta =
    respuestaSubida ??
    ((nombre: string) => ({
      status: 201,
      cuerpo: {
        ...documentoExistente,
        id: 'doc-2',
        nombre,
        subido_por: USUARIO_ID,
        tamano_bytes: PDF.buffer.length,
        creado_en: '2026-11-08T12:00:00Z',
      },
    }));

  await page.route('**/api/viajes/**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');

    if (ruta === `/viajes/${VIAJE_ID}/documentos` && peticion.method() === 'GET') {
      return json(route, 200, { documentos: [...subidos, documentoExistente] });
    }
    if (ruta === `/viajes/${VIAJE_ID}/documentos` && peticion.method() === 'POST') {
      const cuerpo = peticion.postData() ?? '';
      recibidas.push({
        cabecera: peticion.headers()['authorization'],
        tipo: peticion.headers()['content-type'],
        cuerpo,
      });
      const nombre = /filename="([^"]+)"/.exec(cuerpo)?.[1] ?? 'documento';
      const { status, cuerpo: devuelto } = respuesta(nombre);
      if (status === 201) subidos.unshift(devuelto);
      return json(route, status, devuelto);
    }
    return json(route, 200, { ...viaje, estado });
  });

  return { recibidas };
};

const rutaCartera = `/viajes/${VIAJE_ID}/documentos`;
const filas = (page: Page) => page.getByRole('list', { name: 'Documentos del viaje' }).getByRole('listitem');

test.describe('Cartera de documentos', () => {
  test('muestra los documentos del viaje con quién los subió', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(rutaCartera);

    await expect(page.getByText('Cartera de Documentos', { exact: true })).toBeVisible();
    await expect(filas(page)).toHaveCount(1);
    await expect(filas(page).first()).toContainText('Reserva del hotel.pdf');
    await expect(filas(page).first()).toContainText('PDF · 243 KB');
    await expect(filas(page).first()).toContainText('Subido por Berta');
  });

  test('se sube un PDF y aparece el primero de la lista con su nombre', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidas } = await simularBackend(page);

    await page.goto(rutaCartera);
    await expect(filas(page)).toHaveCount(1);
    await page.getByLabel('Elegir el documento que se va a subir').setInputFiles(PDF);

    await expect(page.getByRole('status')).toContainText('«billete.pdf» se ha añadido a la cartera');
    await expect(filas(page)).toHaveCount(2);
    await expect(filas(page).first()).toContainText('billete.pdf');
    await expect(filas(page).first()).toContainText('Subido por Adriana');

    expect(recibidas).toHaveLength(1);
    expect(recibidas[0].cabecera).toBe('Bearer token-acceso');
    expect(recibidas[0].tipo).toContain('multipart/form-data');
    expect(recibidas[0].cuerpo).toContain('name="archivo"; filename="billete.pdf"');
  });

  test('un archivo de tipo no permitido se rechaza sin llamar al servidor', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidas } = await simularBackend(page);

    await page.goto(rutaCartera);
    await expect(filas(page)).toHaveCount(1);
    await page
      .getByLabel('Elegir el documento que se va a subir')
      .setInputFiles({ name: 'notas.txt', mimeType: 'text/plain', buffer: Buffer.from('hola') });

    await expect(page.getByRole('alert')).toContainText('Solo se pueden subir documentos PDF o imágenes JPEG o PNG');
    await expect(filas(page)).toHaveCount(1);
    expect(recibidas).toHaveLength(0);
  });

  test('un archivo de más de 8 MB se rechaza sin llamar al servidor', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidas } = await simularBackend(page);

    await page.goto(rutaCartera);
    await expect(filas(page)).toHaveCount(1);
    await page
      .getByLabel('Elegir el documento que se va a subir')
      .setInputFiles({ name: 'enorme.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(8_000_001, 1) });

    await expect(page.getByRole('alert')).toContainText('El documento no puede ocupar más de 8 MB');
    expect(recibidas).toHaveLength(0);
  });

  test('muestra el error que devuelve el servidor y la lista no cambia', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, {
      respuestaSubida: () => ({
        status: 400,
        cuerpo: { error: { codigo: 'tipo_no_permitido', mensaje: 'Solo se pueden subir documentos PDF o imágenes JPEG o PNG' } },
      }),
    });

    await page.goto(rutaCartera);
    await expect(filas(page)).toHaveCount(1);
    await page.getByLabel('Elegir el documento que se va a subir').setInputFiles(PDF);

    await expect(page.getByRole('alert')).toContainText('No se ha podido subir el documento: Solo se pueden subir');
    await expect(filas(page)).toHaveCount(1);
  });

  test('en un viaje archivado se ven los documentos pero no se puede subir ninguno', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { estado: 'archivado' });

    await page.goto(rutaCartera);

    await expect(filas(page)).toHaveCount(1);
    await expect(page.getByText(/ya no se pueden subir/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Subir documento' })).toHaveCount(0);
    await expect(page.getByLabel('Elegir el documento que se va a subir')).toHaveCount(0);
  });

  test('sin sesión lleva al login', async ({ page }) => {
    await page.goto(rutaCartera);
    await expect(page).toHaveURL(/\/login$/);
  });
});
