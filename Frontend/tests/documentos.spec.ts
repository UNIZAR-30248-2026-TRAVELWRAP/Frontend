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

const ARCHIVOS = 'https://storage.test/firmado';

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

const imagenExistente = {
  ...documentoExistente,
  id: 'doc-img',
  nombre: 'Foto del hotel.png',
  tipo_mime: 'image/png',
};

// Respuesta de GET .../documentos/:id/url
const enlaceDe = (documento: typeof documentoExistente) => ({
  url: `${ARCHIVOS}/${documento.id}`,
  expira_en: '2026-11-08T10:05:00Z',
  nombre: documento.nombre,
  tipo_mime: documento.tipo_mime,
});

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// PDF de una página con texto; pdf.js reconstruye solo la tabla de referencias cruzadas
const PDF_UNA_PAGINA = Buffer.from(
  [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    '4 0 obj << /Length 47 >>',
    'stream',
    'BT /F1 12 Tf 20 50 Td (Billete de prueba) Tj ET',
    'endstream endobj',
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    'trailer << /Root 1 0 R /Size 6 >>',
    '%%EOF',
  ].join('\n'),
);

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
    documentos = [documentoExistente],
    respuestaUrl,
    respuestaBorrado,
  }: {
    estado?: string;
    respuestaSubida?: (nombre: string) => { status: number; cuerpo: unknown };
    documentos?: (typeof documentoExistente)[];
    respuestaUrl?: (documento: typeof documentoExistente) => { status: number; cuerpo: unknown };
    // Respuesta de DELETE .../documentos/:id. Por defecto, 204 sin cuerpo
    respuestaBorrado?: () => { status: number; cuerpo?: unknown };
  } = {},
) => {
  // Rutas (con su consulta) de los enlaces que ha pedido la pantalla
  const enlacesPedidos: string[] = [];
  const recibidas: Subida[] = [];
  // Rutas de los DELETE recibidos y documentos que el servidor da ya por eliminados
  const borrados: string[] = [];
  const eliminados = new Set<string>();
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
      return json(route, 200, { documentos: [...subidos, ...documentos].filter((d) => !eliminados.has(d.id)) });
    }
    const borrado = /^\/viajes\/[^/]+\/documentos\/([^/]+)$/.exec(ruta);
    if (borrado && peticion.method() === 'DELETE') {
      borrados.push(ruta);
      const { status, cuerpo } = respuestaBorrado ? respuestaBorrado() : { status: 204, cuerpo: undefined };
      if (status === 204) eliminados.add(borrado[1]);
      return cuerpo === undefined ? route.fulfill({ status }) : json(route, status, cuerpo);
    }
    const enlace = /^\/viajes\/[^/]+\/documentos\/([^/]+)\/url$/.exec(ruta);
    if (enlace && peticion.method() === 'GET') {
      enlacesPedidos.push(ruta + new URL(peticion.url()).search);
      const documento = documentos.find((d) => d.id === enlace[1]) ?? documentoExistente;
      const { status, cuerpo } = respuestaUrl ? respuestaUrl(documento) : { status: 200, cuerpo: enlaceDe(documento) };
      return json(route, status, cuerpo);
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

  return { recibidas, enlacesPedidos, borrados };
};

// Supabase Storage simulado: sirve un PDF de una página o un PNG de 1×1 según el documento, con CORS abierto como
// el de Supabase para que pdf.js pueda leerlo desde otro origen. Devuelve las URL que ha servido
const simularArchivos = async (page: Page) => {
  const servidas: string[] = [];
  await page.route(`${ARCHIVOS}/**`, (route) => {
    const peticion = route.request();
    const cabeceras = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    if (peticion.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cabeceras });
    servidas.push(peticion.url());
    const esPdf = peticion.url().endsWith('/doc-1');
    return route.fulfill({
      status: 200,
      headers: cabeceras,
      contentType: esPdf ? 'application/pdf' : 'image/png',
      body: esPdf ? PDF_UNA_PAGINA : PNG_1X1,
    });
  });
  return { servidas };
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

  test('se abre un PDF: pdf.js dibuja la página y «Cerrar» vuelve a la cartera', async ({ page }) => {
    await entrarConSesion(page);
    const { enlacesPedidos } = await simularBackend(page);
    const { servidas } = await simularArchivos(page);

    await page.goto(rutaCartera);
    await page.getByRole('button', { name: 'Abrir Reserva del hotel.pdf' }).click();

    const dialogo = page.getByRole('dialog', { name: 'Documento: Reserva del hotel.pdf' });
    await expect(dialogo.getByLabel('Página 1 del documento')).toBeVisible();
    await expect(dialogo.getByText('Página 1 de 1')).toBeVisible();
    // El lienzo se ha dibujado: ya no está en blanco
    await expect
      .poll(() =>
        dialogo.getByLabel('Página 1 del documento').evaluate((lienzo: HTMLCanvasElement) => {
          const datos = lienzo.getContext('2d')?.getImageData(0, 0, lienzo.width, lienzo.height).data ?? [];
          return datos.some((valor, indice) => indice % 4 !== 3 && valor < 200);
        }),
      )
      .toBe(true);
    // En desarrollo React monta los efectos dos veces, así que una misma petición puede repetirse
    expect(new Set(enlacesPedidos)).toEqual(new Set([`/viajes/${VIAJE_ID}/documentos/doc-1/url`]));
    expect(new Set(servidas)).toEqual(new Set([`${ARCHIVOS}/doc-1`]));

    await dialogo.getByRole('button', { name: 'Cerrar' }).click();
    await expect(dialogo).toHaveCount(0);
    await expect(filas(page)).toHaveCount(1);
  });

  test('se abre una imagen ampliada y Escape la cierra', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { documentos: [imagenExistente] });
    await simularArchivos(page);

    await page.goto(rutaCartera);
    await page.getByRole('button', { name: 'Abrir Foto del hotel.png' }).click();

    const imagen = page.getByRole('dialog').getByRole('img', { name: 'Foto del hotel.png' });
    await expect(imagen).toBeVisible();
    await expect(imagen).toHaveAttribute('src', `${ARCHIVOS}/doc-img`);
    await expect.poll(() => imagen.evaluate((elemento: HTMLImageElement) => elemento.naturalWidth)).toBe(1);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('si el servidor falla, la vista previa muestra el error y «Reintentar» abre el documento', async ({ page }) => {
    await entrarConSesion(page);
    let servidorCaido = true;
    await simularBackend(page, {
      documentos: [imagenExistente],
      respuestaUrl: (documento) =>
        servidorCaido
          ? { status: 502, cuerpo: { error: { codigo: 'error_documento', mensaje: 'No se ha podido obtener el enlace del documento' } } }
          : { status: 200, cuerpo: enlaceDe(documento) },
    });
    await simularArchivos(page);

    await page.goto(rutaCartera);
    await page.getByRole('button', { name: 'Abrir Foto del hotel.png' }).click();

    await expect(page.getByRole('alert')).toContainText('No se ha podido abrir el documento');
    servidorCaido = false;
    await page.getByRole('button', { name: 'Reintentar' }).click();

    await expect(page.getByRole('dialog').getByRole('img', { name: 'Foto del hotel.png' })).toBeVisible();
  });

  test('si el documento ya no existe, la vista previa lo dice', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, {
      respuestaUrl: () => ({ status: 404, cuerpo: { error: { codigo: 'documento_no_encontrado', mensaje: 'No existe' } } }),
    });

    await page.goto(rutaCartera);
    await page.getByRole('button', { name: 'Abrir Reserva del hotel.pdf' }).click();

    await expect(page.getByRole('alert')).toContainText('ya no existe');
  });

  test('en un viaje archivado también se abre un documento', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { estado: 'archivado', documentos: [imagenExistente] });
    await simularArchivos(page);

    await page.goto(rutaCartera);
    await page.getByRole('button', { name: 'Abrir Foto del hotel.png' }).click();

    await expect(page.getByRole('dialog').getByRole('img', { name: 'Foto del hotel.png' })).toBeVisible();
  });

  test('sin sesión lleva al login', async ({ page }) => {
    await page.goto(rutaCartera);
    await expect(page).toHaveURL(/\/login$/);
  });

  test.describe('eliminar un documento', () => {
    const papelera = (page: Page) => page.getByRole('button', { name: 'Eliminar Reserva del hotel.pdf' });

    test('al confirmar, el documento se elimina de la cartera', async ({ page }) => {
      await entrarConSesion(page);
      const { borrados } = await simularBackend(page);

      await page.goto(rutaCartera);
      await expect(filas(page)).toHaveCount(1);
      await papelera(page).click();

      const dialogo = page.getByRole('dialog');
      await expect(dialogo).toContainText('¿Eliminar este documento?');
      await expect(dialogo).toContainText('Reserva del hotel.pdf');
      await dialogo.getByRole('button', { name: 'Eliminar documento' }).click();

      await expect(page.getByRole('status')).toContainText('Documento eliminado');
      await expect(dialogo).toHaveCount(0);
      await expect(filas(page)).toHaveCount(0);
      await expect(page.getByText('Aún no hay documentos en la cartera del viaje.')).toBeVisible();
      // Es una acción del usuario, no de un efecto: llega una sola petición
      expect(borrados).toEqual([`/viajes/${VIAJE_ID}/documentos/doc-1`]);
    });

    test('al cancelar, el documento se mantiene y no se llama al servidor', async ({ page }) => {
      await entrarConSesion(page);
      const { borrados } = await simularBackend(page);

      await page.goto(rutaCartera);
      await expect(filas(page)).toHaveCount(1);
      await papelera(page).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(filas(page)).toHaveCount(1);
      await expect(filas(page).first()).toContainText('Reserva del hotel.pdf');
      expect(borrados).toHaveLength(0);
    });

    test('si el servidor falla, el error sale en el diálogo y el documento sigue en la lista', async ({ page }) => {
      await entrarConSesion(page);
      const { borrados } = await simularBackend(page, {
        respuestaBorrado: () => ({
          status: 502,
          cuerpo: { error: { codigo: 'error_documento', mensaje: 'No se ha podido eliminar el documento' } },
        }),
      });

      await page.goto(rutaCartera);
      await expect(filas(page)).toHaveCount(1);
      await papelera(page).click();
      const dialogo = page.getByRole('dialog');
      await dialogo.getByRole('button', { name: 'Eliminar documento' }).click();

      await expect(dialogo.getByRole('alert')).toContainText('No se ha podido eliminar el documento');
      await expect(dialogo.getByRole('button', { name: 'Eliminar documento' })).toBeEnabled();
      await expect(filas(page)).toHaveCount(1);
      await expect(page.getByRole('status')).toHaveCount(0);
      expect(borrados).toHaveLength(1);
    });

    test('si otro miembro ya lo había eliminado, se quita de la lista con su aviso', async ({ page }) => {
      await entrarConSesion(page);
      await simularBackend(page, {
        respuestaBorrado: () => ({
          status: 404,
          cuerpo: { error: { codigo: 'documento_no_encontrado', mensaje: 'El documento no existe en este viaje' } },
        }),
      });

      await page.goto(rutaCartera);
      await papelera(page).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Eliminar documento' }).click();

      await expect(page.getByRole('status')).toContainText('Este documento ya lo había eliminado otro miembro');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(filas(page)).toHaveCount(0);
    });

    test('en un viaje archivado no hay botón para eliminar', async ({ page }) => {
      await entrarConSesion(page);
      await simularBackend(page, { estado: 'archivado' });

      await page.goto(rutaCartera);

      await expect(filas(page)).toHaveCount(1);
      await expect(page.getByRole('button', { name: /^Eliminar / })).toHaveCount(0);
    });
  });
});
