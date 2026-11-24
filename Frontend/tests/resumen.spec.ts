import { test, expect, type Page, type Route } from '@playwright/test';
import { irADiapositiva } from './support/wrap';

const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA_ID = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f';
const VIAJE_ID = 'roma';

const sesion = {
  usuario: { id: USUARIO_ID, nombre: 'Adriana', email: EMAIL, avatar_url: null, creado_en: '2026-10-06T15:29:32Z' },
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
  estado: 'finalizado',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'miembro',
  miembros: [
    { usuario_id: BERTA_ID, nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
};

const RESUMEN = {
  dias: 4,
  actividad_mas_votada: { titulo: 'Coliseo', votos: 3 },
  alma_del_grupo: { usuario_id: BERTA_ID, nombre: 'Berta', pagos: 2, planes_propuestos: 4, fotos_subidas: 1 },
};

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

const simularBackend = async (
  page: Page,
  { fallaResumen = false, resumen = RESUMEN, fotos = true }: { fallaResumen?: boolean; resumen?: unknown; fotos?: boolean } = {},
) => {
  const foto = {
    id: 'f1',
    viaje_id: VIAJE_ID,
    nombre: 'coliseo.jpg',
    tipo_mime: 'image/jpeg',
    tamano_bytes: 1,
    subido_por: BERTA_ID,
    creado_en: '2027-05-12T10:00:00Z',
    url: 'https://storage.test/coliseo.jpg',
  };
  await page.route('**/api/viajes/**', async (route) => {
    const ruta = new URL(route.request().url()).pathname.replace(/^.*\/api/, '');
    if (ruta === `/viajes/${VIAJE_ID}/resumen`) {
      return fallaResumen
        ? json(route, 502, { error: { codigo: 'error_resumen', mensaje: 'No se ha podido calcular el resumen del viaje' } })
        : json(route, 200, resumen);
    }
    if (ruta === `/viajes/${VIAJE_ID}/fotos`) return json(route, 200, { fotos: fotos ? [foto] : [] });
    return json(route, 200, viaje);
  });
};

const sinDesbordamiento = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('Resumen de fin de viaje (Wrap)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('recorre las siete diapositivas y termina en las acciones', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);

    await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();
    await expect(page.getByRole('region')).toHaveAccessibleName(/1 de 7: Portada/);

    await irADiapositiva(page, 2);
    await expect(page.getByText('días de aventura')).toBeVisible();

    await irADiapositiva(page, 3);
    await expect(page.getByText('3 votos')).toBeVisible();

    await irADiapositiva(page, 4);
    await expect(page.getByRole('list', { name: 'Estadísticas de Berta' })).toBeVisible();

    await irADiapositiva(page, 5);
    await expect(page.getByAltText('coliseo.jpg')).toBeVisible();

    await irADiapositiva(page, 6);
    await expect(page.getByRole('region')).toHaveAccessibleName(/6 de 7: Resumen/);
    await expect(page.getByAltText('Resumen del viaje a Roma')).toBeVisible({ timeout: 15000 });

    await irADiapositiva(page, 7);
    await expect(page.getByRole('region')).toHaveAccessibleName(/7 de 7: Acciones/);
    await expect(page.getByRole('button', { name: 'Reabrir viaje' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ir a Mis viajes' })).toHaveCount(0);
  });

  test('un viaje sin datos solo enseña la portada, el tiempo juntos y el resumen', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { resumen: { dias: 4, actividad_mas_votada: null, alma_del_grupo: null }, fotos: false });

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);

    await expect(page.getByRole('region')).toHaveAccessibleName(/1 de 4: Portada/);
    await expect(page.getByText('TravelWrap · Resumen')).toBeVisible();
    await expect(async () => {
      if (/1 de 4/.test((await page.getByRole('region').getAttribute('aria-label')) ?? '')) await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('region')).toHaveAccessibleName(/2 de 4: Tiempo juntos/, { timeout: 1000 });
    }).toPass();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('region')).toHaveAccessibleName(/3 de 4: Resumen/);
    await expect(page.getByAltText('Resumen del viaje a Roma')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Nadie votó actividades en este viaje')).toHaveCount(0);
    await expect(page.getByText('0 fotos')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Descargar imagen' })).toBeVisible();
  });


  test('la última diapositiva enseña la imagen del resumen y «Descargar imagen» baja ese mismo PNG vertical', async ({ page }) => {
    await entrarConSesion(page);
    await page.route('https://storage.test/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1, headers: { 'access-control-allow-origin': '*' } }),
    );
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);
    await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();
    await irADiapositiva(page, 6);

    const imagen = page.getByAltText('Resumen del viaje a Roma');
    await expect(imagen).toBeVisible();
    const proporcion = await imagen.evaluate((el) => (el as HTMLImageElement).naturalHeight / (el as HTMLImageElement).naturalWidth);
    expect(proporcion).toBeGreaterThanOrEqual(1920 / 1080 - 0.01);
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar imagen' }).click();

    const archivo = await descarga;
    expect(archivo.suggestedFilename()).toBe('TravelWrap-Roma-2027.png');
    const ruta = await archivo.path();
    const fs = await import('node:fs');
    const bytes = fs.readFileSync(ruta);
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.readUInt32BE(16)).toBe(1080);
    expect(bytes.readUInt32BE(20)).toBeGreaterThanOrEqual(1920);
    await expect(page.getByRole('button', { name: 'Descargar imagen' })).toBeEnabled();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('«Compartir» comparte la imagen del resumen con el menú del dispositivo', async ({ page }) => {
    await entrarConSesion(page);
    await page.route('https://storage.test/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1, headers: { 'access-control-allow-origin': '*' } }),
    );
    await page.addInitScript(() => {
      const compartidos: { nombre: string; tipo: string; bytes: number }[] = [];
      (window as unknown as { compartidos: typeof compartidos }).compartidos = compartidos;
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (datos: { files: File[] }) => {
          compartidos.push({ nombre: datos.files[0].name, tipo: datos.files[0].type, bytes: datos.files[0].size });
        },
      });
    });
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);
    await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();
    await irADiapositiva(page, 6);
    await expect(page.getByAltText('Resumen del viaje a Roma')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Compartir' }).click();

    await expect
      .poll(() => page.evaluate(() => (window as unknown as { compartidos: { nombre: string; tipo: string; bytes: number }[] }).compartidos))
      .toEqual([expect.objectContaining({ nombre: 'TravelWrap-Roma-2027.png', tipo: 'image/png' })]);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('si el navegador no sabe compartir archivos «Compartir» descarga la imagen y avisa', async ({ page }) => {
    await entrarConSesion(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    });
    await simularBackend(page, { fotos: false });

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);
    await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();
    await irADiapositiva(page, 5);
    await expect(page.getByAltText('Resumen del viaje a Roma')).toBeVisible({ timeout: 15000 });

    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Compartir' }).click();

    expect((await descarga).suggestedFilename()).toBe('TravelWrap-Roma-2027.png');
    await expect(page.getByRole('status')).toContainText('se ha descargado la imagen');
  });



  test('en 320 px ninguna diapositiva desborda y los botones siguen visibles', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);
    await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();

    for (let diapositiva = 1; diapositiva <= 6; diapositiva++) {
      await irADiapositiva(page, diapositiva);
      expect(await sinDesbordamiento(page)).toBe(true);
    }
    await irADiapositiva(page, 7);
    await expect(page.getByRole('button', { name: 'Reabrir viaje' })).toBeInViewport();
  });

  test('si el servidor falla muestra el error y se puede volver', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { fallaResumen: true });

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);

    await expect(page.getByRole('alert')).toContainText('No se ha podido preparar el resumen');
    await expect(page.getByRole('region')).toBeVisible();
  });

});
