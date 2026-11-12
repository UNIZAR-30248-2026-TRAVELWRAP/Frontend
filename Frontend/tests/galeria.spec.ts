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

const fotoDe = (id: string, nombre: string, datos: Record<string, unknown> = {}) => ({
  id,
  viaje_id: VIAJE_ID,
  nombre,
  tipo_mime: 'image/jpeg',
  tamano_bytes: 248731,
  subido_por: BERTA_ID,
  creado_en: '2027-05-12T10:00:00Z',
  url: `https://storage.test/${nombre}`,
  ...datos,
});

const FOTOS = [fotoDe('f3', 'plaza.jpg'), fotoDe('f2', 'trevi.jpg'), fotoDe('f1', 'coliseo.jpg')];

const JPEG = { name: 'nueva.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]) };

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

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
  await page.route('https://storage.test/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }));
};

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

type Subida = { cabecera: string | undefined; tipo: string | undefined; cuerpo: string };

const simularBackend = async (
  page: Page,
  {
    estado = 'activo',
    fotos = FOTOS,
    respuestaSubida,
  }: {
    estado?: string;
    fotos?: unknown[];
    respuestaSubida?: (nombre: string) => { status: number; cuerpo: unknown };
  } = {},
) => {
  const recibidas: Subida[] = [];
  const subidas: unknown[] = [];
  const respuesta =
    respuestaSubida ??
    ((nombre: string) => ({ status: 201, cuerpo: fotoDe('f4', nombre, { subido_por: USUARIO_ID }) }));

  await page.route('**/api/viajes/**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');

    if (ruta === `/viajes/${VIAJE_ID}/fotos` && peticion.method() === 'GET') {
      return json(route, 200, { fotos: [...subidas, ...fotos] });
    }
    if (ruta === `/viajes/${VIAJE_ID}/fotos` && peticion.method() === 'POST') {
      const cuerpo = peticion.postData() ?? '';
      recibidas.push({ cabecera: peticion.headers()['authorization'], tipo: peticion.headers()['content-type'], cuerpo });
      const nombre = /filename="([^"]+)"/.exec(cuerpo)?.[1] ?? 'foto.jpg';
      const { status, cuerpo: devuelto } = respuesta(nombre);
      if (status === 201) subidas.unshift(devuelto);
      return json(route, status, devuelto);
    }
    if (ruta === `/viajes/${VIAJE_ID}/documentos`) return json(route, 200, { documentos: [] });
    return json(route, 200, { ...viaje, estado });
  });

  return { recibidas };
};

const rutaGaleria = `/viajes/${VIAJE_ID}/galeria`;
const miniaturas = (page: Page) => page.getByRole('list', { name: 'Fotos del viaje' }).getByRole('listitem');
const selector = (page: Page) => page.getByLabel('Elegir la foto que se va a subir');

test.describe('Galería de fotos', () => {
  test('muestra las fotos del viaje con el recuento y los miembros', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(rutaGaleria);

    await expect(page.getByText('Chat y Galería', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Galería' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Chat' })).toBeDisabled();
    await expect(miniaturas(page)).toHaveCount(3);
    await expect(miniaturas(page).first().getByRole('button')).toHaveAccessibleName('Ampliar plaza.jpg');
    await expect(page.getByText('3 fotos · 2 miembros')).toBeVisible();
    await expect(miniaturas(page).first().locator('img')).toHaveJSProperty('complete', true);
  });

  test('sin fotos muestra el estado vacío', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { fotos: [] });

    await page.goto(rutaGaleria);

    await expect(page.getByText('Aún no hay fotos en la galería del viaje.')).toBeVisible();
    await expect(page.getByText('0 fotos · 2 miembros')).toBeVisible();
  });

  test('se sube una foto y aparece la primera de la galería', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidas } = await simularBackend(page);

    await page.goto(rutaGaleria);
    await expect(miniaturas(page)).toHaveCount(3);
    await selector(page).setInputFiles(JPEG);

    await expect(miniaturas(page)).toHaveCount(4);
    await expect(miniaturas(page).first().getByRole('button')).toHaveAccessibleName('Ampliar nueva.jpg');
    await expect(page.getByText('4 fotos · 2 miembros')).toBeVisible();

    expect(recibidas).toHaveLength(1);
    expect(recibidas[0].cabecera).toBe('Bearer token-acceso');
    expect(recibidas[0].tipo).toContain('multipart/form-data');
    expect(recibidas[0].cuerpo).toContain('name="archivo"; filename="nueva.jpg"');
  });

  test('se pueden elegir varias fotos a la vez y se suben todas', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidas } = await simularBackend(page);

    await page.goto(rutaGaleria);
    await expect(miniaturas(page)).toHaveCount(3);
    await expect(selector(page)).toHaveAttribute('multiple', '');
    await selector(page).setInputFiles([
      { ...JPEG, name: 'uno.jpg' },
      { ...JPEG, name: 'dos.jpg' },
      { ...JPEG, name: 'tres.jpg' },
    ]);

    await expect(miniaturas(page)).toHaveCount(6);
    await expect(page.getByText('6 fotos · 2 miembros')).toBeVisible();
    expect(recibidas.map((r) => /filename="([^"]+)"/.exec(r.cuerpo)?.[1])).toEqual(['uno.jpg', 'dos.jpg', 'tres.jpg']);
  });

  test('un archivo que no es una foto se rechaza sin llamar al servidor', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidas } = await simularBackend(page);

    await page.goto(rutaGaleria);
    await expect(miniaturas(page)).toHaveCount(3);
    await selector(page).setInputFiles({ name: 'billete.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });

    await expect(page.getByRole('alert')).toContainText('Solo se pueden subir fotos JPEG, PNG o WebP');
    await expect(miniaturas(page)).toHaveCount(3);
    expect(recibidas).toHaveLength(0);
  });

  test('una foto de más de 8 MB se rechaza sin llamar al servidor', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidas } = await simularBackend(page);

    await page.goto(rutaGaleria);
    await expect(miniaturas(page)).toHaveCount(3);
    await selector(page).setInputFiles({ name: 'enorme.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(8_000_001, 1) });

    await expect(page.getByRole('alert')).toContainText('La foto no puede ocupar más de 8 MB');
    expect(recibidas).toHaveLength(0);
  });

  test('muestra el error que devuelve el servidor y la galería no cambia', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, {
      respuestaSubida: () => ({
        status: 400,
        cuerpo: { error: { codigo: 'tipo_no_permitido', mensaje: 'Solo se pueden subir fotos JPEG, PNG o WebP' } },
      }),
    });

    await page.goto(rutaGaleria);
    await expect(miniaturas(page)).toHaveCount(3);
    await selector(page).setInputFiles(JPEG);

    await expect(page.getByRole('alert')).toContainText('No se ha podido subir la foto: Solo se pueden subir fotos');
    await expect(miniaturas(page)).toHaveCount(3);
  });

  test('en un viaje finalizado se ven las fotos pero no se puede subir ninguna', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { estado: 'finalizado' });

    await page.goto(rutaGaleria);

    await expect(miniaturas(page)).toHaveCount(3);
    await expect(page.getByText(/ya no se pueden subir/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Subir' })).toHaveCount(0);
    await expect(selector(page)).toHaveCount(0);
  });

  test('si el servidor falla al cargar se muestra el error', async ({ page }) => {
    await entrarConSesion(page);
    await page.route('**/api/viajes/**', (route) => {
      const ruta = new URL(route.request().url()).pathname;
      if (ruta.endsWith('/fotos')) {
        return json(route, 502, { error: { codigo: 'error_foto', mensaje: 'No se han podido obtener las fotos' } });
      }
      return json(route, 200, viaje);
    });

    await page.goto(rutaGaleria);

    await expect(page.getByRole('alert')).toContainText('No se ha podido cargar la galería: No se han podido obtener las fotos');
  });

  test('desde la barra inferior se llega a la galería con «Más»', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/documentos`);
    await page.getByRole('navigation', { name: 'Secciones del viaje' }).getByRole('button', { name: 'Más' }).click();

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/galeria$`));
    await expect(miniaturas(page)).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Más' })).toHaveAttribute('aria-current', 'page');
  });

  test('sin sesión lleva al login', async ({ page }) => {
    await page.goto(rutaGaleria);
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe('Galería de fotos · ampliar una foto', () => {
  test('al pulsar una foto se abre el visor y con las flechas y Escape se navega y se cierra', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(rutaGaleria);
    await miniaturas(page).nth(1).getByRole('button').click();

    const visor = page.getByRole('dialog');
    await expect(visor).toHaveAccessibleName('Foto 2 de 3: trevi.jpg');
    await expect(visor.getByRole('img', { name: 'trevi.jpg' })).toBeVisible();
    await expect(visor).toContainText('Subida por Berta · 12 may 2027');

    await page.keyboard.press('ArrowRight');
    await expect(visor).toHaveAccessibleName('Foto 3 de 3: coliseo.jpg');
    await expect(visor.getByRole('button', { name: 'Foto siguiente' })).toBeDisabled();

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(visor).toHaveAccessibleName('Foto 1 de 3: plaza.jpg');
    await expect(visor.getByRole('button', { name: 'Foto anterior' })).toBeDisabled();

    await page.keyboard.press('Escape');
    await expect(visor).toHaveCount(0);
    await expect(miniaturas(page).first().getByRole('button')).toBeFocused();
  });

  test('en el visor se desliza con el dedo para pasar de foto, y si se devuelve no cambia', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);
    await page.goto(rutaGaleria);
    await page.getByRole('button', { name: 'Ampliar trevi.jpg' }).click();
    const visor = page.getByRole('dialog');
    await expect(visor).toHaveAccessibleName('Foto 2 de 3: trevi.jpg');

    const caja = await page.getByTestId('zona-foto').boundingBox();
    const y = (caja?.y ?? 0) + (caja?.height ?? 0) / 2;
    const derecha = (caja?.x ?? 0) + (caja?.width ?? 0) * 0.8;
    const izquierda = (caja?.x ?? 0) + (caja?.width ?? 0) * 0.1;

    await page.mouse.move(derecha, y);
    await page.mouse.down();
    await page.mouse.move(izquierda, y, { steps: 6 });
    await page.mouse.move(derecha, y, { steps: 6 });
    await page.mouse.up();
    await expect(visor).toHaveAccessibleName('Foto 2 de 3: trevi.jpg');

    await page.mouse.move(derecha, y);
    await page.mouse.down();
    await page.mouse.move(izquierda, y, { steps: 6 });
    await page.mouse.up();
    await expect(visor).toHaveAccessibleName('Foto 3 de 3: coliseo.jpg');

    await page.mouse.move(izquierda, y);
    await page.mouse.down();
    await page.mouse.move(derecha, y, { steps: 6 });
    await page.mouse.up();
    await expect(visor).toHaveAccessibleName('Foto 2 de 3: trevi.jpg');
  });

  test('con el botón se cierra y la página de fondo no hace scroll mientras está abierto', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(rutaGaleria);
    await miniaturas(page).first().getByRole('button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await page.getByRole('button', { name: 'Cerrar foto' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });

  test('a 320 px de ancho la galería y el visor caben sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(rutaGaleria);
    await expect(miniaturas(page)).toHaveCount(3);
    const sinScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    expect(await sinScroll()).toBe(true);

    await miniaturas(page).first().getByRole('button').click();
    const caja = await page.getByRole('dialog').boundingBox();
    expect(caja?.width).toBeLessThanOrEqual(320);
    for (const nombre of ['Cerrar foto', 'Foto anterior', 'Foto siguiente']) {
      const boton = await page.getByRole('button', { name: nombre }).boundingBox();
      expect(boton?.width).toBeGreaterThanOrEqual(44);
      expect(boton?.height).toBeGreaterThanOrEqual(44);
    }
  });
});
