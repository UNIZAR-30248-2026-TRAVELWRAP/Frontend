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
  await page.route('https://storage.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1, headers: { 'access-control-allow-origin': '*' } }),
  );
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
    respuestaBorrado,
  }: {
    estado?: string;
    fotos?: unknown[];
    respuestaSubida?: (nombre: string) => { status: number; cuerpo: unknown };
    respuestaBorrado?: { status: number; cuerpo: unknown };
  } = {},
) => {
  const recibidas: Subida[] = [];
  const subidas: unknown[] = [];
  const borradas: string[] = [];
  const respuesta =
    respuestaSubida ??
    ((nombre: string) => ({ status: 201, cuerpo: fotoDe('f4', nombre, { subido_por: USUARIO_ID }) }));

  await page.route('**/api/viajes/**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');

    // El chat (pestaña hermana) pide sus mensajes al abrirse: sin mensajes en este escenario
    if (ruta === `/viajes/${VIAJE_ID}/mensajes` && peticion.method() === 'GET') {
      return json(route, 200, { mensajes: [] });
    }
    if (ruta === `/viajes/${VIAJE_ID}/fotos` && peticion.method() === 'GET') {
      const vigentes = [...subidas, ...fotos].filter((f) => !borradas.includes((f as { id: string }).id)) as { tamano_bytes: number }[];
      const usado = vigentes.reduce((total, f) => total + f.tamano_bytes, 0);
      return json(route, 200, { fotos: vigentes, almacenamiento: { usado_bytes: usado, limite_bytes: 200_000_000 } });
    }
    if (ruta.startsWith(`/viajes/${VIAJE_ID}/fotos/`) && peticion.method() === 'DELETE') {
      if (respuestaBorrado) return json(route, respuestaBorrado.status, respuestaBorrado.cuerpo);
      borradas.push(ruta.split('/').pop() ?? '');
      return route.fulfill({ status: 204 });
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

  return { recibidas, borradas };
};

const rutaGaleria = `/viajes/${VIAJE_ID}/galeria`;
const miniaturas = (page: Page) => page.getByRole('list', { name: 'Fotos del viaje' }).getByRole('listitem');
const selector = (page: Page) => page.getByLabel('Elegir las fotos o vídeos que se van a subir');

test.describe('Galería de fotos', () => {
  test('muestra las fotos del viaje con el recuento y los miembros', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(rutaGaleria);

    await expect(page.getByText('Chat y Galería', { exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Galería' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Chat' })).toBeEnabled();
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

    await expect(page.getByRole('alert')).toContainText('Solo se pueden subir fotos (JPEG, PNG o WebP) o vídeos (MP4, WebM o MOV)');
    await expect(miniaturas(page)).toHaveCount(3);
    expect(recibidas).toHaveLength(0);
  });





  test('desde la barra inferior se llega al chat y de ahí a la galería', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/documentos`);
    await page.getByRole('navigation', { name: 'Secciones del viaje' }).getByRole('button', { name: 'Chat' }).click();
    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/chat$`));
    await expect(page.getByRole('navigation', { name: 'Secciones del viaje' }).getByRole('button', { name: 'Chat' })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('tab', { name: 'Galería' }).click();
    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/galeria$`));
    await expect(miniaturas(page)).toHaveCount(3);
  });

  test('sin sesión lleva al login', async ({ page }) => {
    await page.goto(rutaGaleria);
    await expect(page).toHaveURL(/\/login$/);
  });
});

const VIDEO = fotoDe('v1', 'paseo.mp4', { tipo_mime: 'video/mp4', tamano_bytes: 5_000_000 });
const visorAbierto = (page: Page) => page.getByRole('dialog');
const dialogoBorrar = (page: Page, titulo: string) => page.getByRole('dialog', { name: titulo });

test.describe('Galería de fotos · vídeos, borrar y espacio', () => {
  test('un vídeo sale en la rejilla, se cuenta aparte y se reproduce en el visor', async ({ page }) => {
    await entrarConSesion(page);
    await page.route('https://storage.test/paseo.mp4', (route) => route.fulfill({ status: 200, contentType: 'video/mp4', body: Buffer.alloc(10) }));
    await simularBackend(page, { fotos: [VIDEO, ...FOTOS] });

    await page.goto(rutaGaleria);

    await expect(page.getByText('3 fotos · 1 vídeo · 2 miembros')).toBeVisible();
    await page.getByRole('button', { name: 'Reproducir paseo.mp4' }).click();
    await expect(visorAbierto(page)).toHaveAccessibleName('Vídeo 1 de 4: paseo.mp4');
    await expect(visorAbierto(page).locator('video[controls]')).toBeVisible();
  });

  test('se sube un vídeo y el recuento y el espacio usado lo reflejan', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidas } = await simularBackend(page, {
      respuestaSubida: (nombre) => ({ status: 201, cuerpo: fotoDe('v2', nombre, { tipo_mime: 'video/mp4', tamano_bytes: 5_000_000, subido_por: USUARIO_ID }) }),
    });
    await page.goto(rutaGaleria);
    await expect(page.getByText('0,7 MB de 200 MB usados')).toBeVisible();

    await selector(page).setInputFiles({ name: 'clip.mp4', mimeType: 'video/mp4', buffer: Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70]) });

    await expect(page.getByRole('button', { name: 'Reproducir clip.mp4' })).toBeVisible();
    await expect(page.getByText('3 fotos · 1 vídeo · 2 miembros')).toBeVisible();
    await expect(page.getByText('5,7 MB de 200 MB usados')).toBeVisible();
    expect(recibidas).toHaveLength(1);
  });

  test('se borra una foto desde el visor tras confirmar: el visor pasa a la siguiente y el espacio baja', async ({ page }) => {
    await entrarConSesion(page);
    const { borradas } = await simularBackend(page);
    await page.goto(rutaGaleria);
    await page.getByRole('button', { name: 'Ampliar trevi.jpg' }).click();

    await visorAbierto(page).getByRole('button', { name: 'Borrar foto' }).click();
    await expect(dialogoBorrar(page, '¿Borrar esta foto?')).toContainText('trevi.jpg');
    await dialogoBorrar(page, '¿Borrar esta foto?').getByRole('button', { name: 'Borrar foto' }).click();

    await expect(dialogoBorrar(page, '¿Borrar esta foto?')).toHaveCount(0);
    expect(borradas).toEqual(['f2']);
    await expect(visorAbierto(page)).toHaveAccessibleName('Foto 2 de 2: coliseo.jpg');
    await page.getByRole('button', { name: 'Cerrar foto' }).click();
    await expect(miniaturas(page)).toHaveCount(2);
    await expect(page.getByText('2 fotos · 2 miembros')).toBeVisible();
  });

  test('cancelar el borrado no borra nada', async ({ page }) => {
    await entrarConSesion(page);
    const { borradas } = await simularBackend(page);
    await page.goto(rutaGaleria);
    await page.getByRole('button', { name: 'Ampliar trevi.jpg' }).click();
    await visorAbierto(page).getByRole('button', { name: 'Borrar foto' }).click();

    await dialogoBorrar(page, '¿Borrar esta foto?').getByRole('button', { name: 'Cancelar' }).click();

    await expect(dialogoBorrar(page, '¿Borrar esta foto?')).toHaveCount(0);
    expect(borradas).toEqual([]);
    await expect(visorAbierto(page)).toHaveAccessibleName('Foto 2 de 3: trevi.jpg');
  });


  test('en un viaje archivado el visor no ofrece borrar', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { estado: 'archivado' });
    await page.goto(rutaGaleria);

    await page.getByRole('button', { name: 'Ampliar trevi.jpg' }).click();

    await expect(visorAbierto(page)).toHaveAccessibleName('Foto 2 de 3: trevi.jpg');
    await expect(visorAbierto(page).getByRole('button', { name: 'Borrar foto' })).toHaveCount(0);
  });
});

const MENSAJE_DESCARGA = 'Tu dispositivo no permite compartir archivos desde el navegador, así que se ha descargado para que lo envíes tú.';

const conMenuDeCompartir = (page: Page, comportamiento: 'acepta' | 'cancela' = 'acepta') =>
  page.addInitScript((modo) => {
    const registro: { nombre: string; tipo: string; tamano: number }[] = [];
    (window as unknown as { compartidos: typeof registro }).compartidos = registro;
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', {
      value: async (datos: { files: File[] }) => {
        if (modo === 'cancela') throw new DOMException('cancelado', 'AbortError');
        registro.push({ nombre: datos.files[0].name, tipo: datos.files[0].type, tamano: datos.files[0].size });
      },
      configurable: true,
    });
  }, comportamiento);

const compartidos = (page: Page) =>
  page.evaluate(() => (window as unknown as { compartidos?: { nombre: string; tipo: string; tamano: number }[] }).compartidos ?? []);

test.describe('Galería de fotos · compartir', () => {
  test('el menú de compartir del dispositivo recibe la foto que se está viendo', async ({ page }) => {
    await entrarConSesion(page);
    await conMenuDeCompartir(page);
    await simularBackend(page);
    await page.goto(rutaGaleria);
    await page.getByRole('button', { name: 'Ampliar trevi.jpg' }).click();

    await page.getByRole('dialog').getByRole('button', { name: 'Compartir foto' }).click();

    await expect.poll(() => compartidos(page)).toEqual([{ nombre: 'trevi.jpg', tipo: 'image/jpeg', tamano: PNG_1X1.length }]);
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('sin menú de compartir del navegador, la foto se descarga y se explica', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);
    await page.goto(rutaGaleria);
    await page.getByRole('button', { name: 'Ampliar coliseo.jpg' }).click();
    const descarga = page.waitForEvent('download');

    await page.getByRole('dialog').getByRole('button', { name: 'Compartir foto' }).click();

    expect((await descarga).suggestedFilename()).toBe('coliseo.jpg');
    await expect(page.getByRole('status')).toHaveText(MENSAJE_DESCARGA);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });






  test('en 320 px los botones del visor miden al menos 44 px y caben en la pantalla', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await entrarConSesion(page);
    await simularBackend(page);
    await page.goto(rutaGaleria);
    await page.getByRole('button', { name: 'Ampliar trevi.jpg' }).click();

    for (const nombre of ['Compartir foto', 'Borrar foto', 'Cerrar foto']) {
      const caja = await page.getByRole('dialog').getByRole('button', { name: nombre }).boundingBox();
      expect(caja && caja.width >= 44 && caja.height >= 44 && caja.x + caja.width <= 320).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

