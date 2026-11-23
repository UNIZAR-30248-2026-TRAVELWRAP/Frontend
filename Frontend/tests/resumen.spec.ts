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

  test('recorre las seis diapositivas y termina en Mis viajes', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);

    await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();
    await expect(page.getByRole('region')).toHaveAccessibleName(/1 de 6: Portada/);

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('días de aventura')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('3 votos')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('list', { name: 'Estadísticas de Berta' })).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByAltText('coliseo.jpg')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('region')).toHaveAccessibleName(/6 de 6: Resumen/);
    await expect(page.getByAltText('Resumen del viaje a Roma')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Ir a Mis viajes' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('un viaje sin datos solo enseña la portada, el tiempo juntos y el resumen', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { resumen: { dias: 4, actividad_mas_votada: null, alma_del_grupo: null }, fotos: false });

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);

    await expect(page.getByRole('region')).toHaveAccessibleName(/1 de 3: Portada/);
    await expect(page.getByText('TravelWrap · Resumen')).toBeVisible();
    await expect(async () => {
      if (/1 de 3/.test((await page.getByRole('region').getAttribute('aria-label')) ?? '')) await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('region')).toHaveAccessibleName(/2 de 3: Tiempo juntos/, { timeout: 1000 });
    }).toPass();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('region')).toHaveAccessibleName(/3 de 3: Resumen/);
    await expect(page.getByAltText('Resumen del viaje a Roma')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Nadie votó actividades en este viaje')).toHaveCount(0);
    await expect(page.getByText('0 fotos')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ir a Mis viajes' })).toBeVisible();
  });

  test('ya no hay diapositivas de gastos ni de balance final', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);
    let pidioElBalance = false;
    page.on('request', (peticion) => {
      if (peticion.url().endsWith('/balance')) pidioElBalance = true;
    });

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);
    await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');

    await expect(page.getByRole('region')).toHaveAccessibleName(/6 de 6: Resumen/);
    await expect(page.getByText('Balance final')).toHaveCount(0);
    await expect(page.getByText('Cena Trastevere')).toHaveCount(0);
    expect(pidioElBalance).toBe(false);
  });

  test('la última diapositiva enseña la imagen del resumen y «Descargar imagen» baja ese mismo PNG vertical', async ({ page }) => {
    await entrarConSesion(page);
    await page.route('https://storage.test/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1, headers: { 'access-control-allow-origin': '*' } }),
    );
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);
    await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');

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
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
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
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
    await expect(page.getByAltText('Resumen del viaje a Roma')).toBeVisible({ timeout: 15000 });

    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Compartir' }).click();

    expect((await descarga).suggestedFilename()).toBe('TravelWrap-Roma-2027.png');
    await expect(page.getByRole('status')).toContainText('se ha descargado la imagen');
  });

  test('si una foto no se puede cargar el resumen se crea sin fotos y se avisa', async ({ page }) => {
    await entrarConSesion(page);
    await page.route('https://storage.test/**', (route) => route.fulfill({ status: 403, body: 'denegado' }));
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);
    await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');

    await expect(page.getByAltText('Resumen del viaje a Roma')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('status')).toContainText('No se han podido incluir las fotos en la imagen');
    await expect(page.getByRole('alert')).toHaveCount(0);
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar imagen' }).click();
    expect((await descarga).suggestedFilename()).toBe('TravelWrap-Roma-2027.png');
  });

  test('un viaje sin votos ni alma ni fotos también enseña la imagen del resumen y se puede descargar', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { resumen: { dias: 4, actividad_mas_votada: null, alma_del_grupo: null }, fotos: false });

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);
    await expect(page.getByText('TravelWrap · Resumen')).toBeVisible();
    await expect(async () => {
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('region')).toHaveAccessibleName(/3 de 3: Resumen/, { timeout: 1000 });
    }).toPass();
    await expect(page.getByAltText('Resumen del viaje a Roma')).toBeVisible({ timeout: 15000 });
    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar imagen' }).click();
    expect((await descarga).suggestedFilename()).toBe('TravelWrap-Roma-2027.png');
  });

  test('en 320 px ninguna diapositiva desborda y los botones siguen visibles', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);
    await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();

    for (let i = 0; i < 6; i++) {
      expect(await sinDesbordamiento(page)).toBe(true);
      await page.keyboard.press('ArrowRight');
    }
    await expect(page.getByRole('button', { name: 'Ir a Mis viajes' })).toBeInViewport();
  });

  test('si el servidor falla muestra el error y se puede volver', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, { fallaResumen: true });

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);

    await expect(page.getByRole('alert')).toContainText('No se ha podido preparar el resumen');
    await expect(page.getByRole('region')).toBeVisible();
  });

  test.describe('como las historias', () => {
    test.use({ reducedMotion: 'no-preference' });

    const punto = async (page: Page, fraccion: number) => {
      const caja = await page.getByRole('region').boundingBox();
      return { x: (caja?.x ?? 0) + (caja?.width ?? 0) * fraccion, y: (caja?.y ?? 0) + (caja?.height ?? 0) / 2 };
    };

    test('el botón de pausa detiene el avance automático y el de reanudar lo continúa', async ({ page }) => {
      await entrarConSesion(page);
      await simularBackend(page);

      await page.goto(`/viajes/${VIAJE_ID}/resumen`);
      await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();
      await page.getByRole('button', { name: 'Pausar' }).click();
      await expect(page.getByRole('button', { name: 'Reanudar' })).toBeVisible();
      await page.waitForTimeout(5600);
      await expect(page.getByRole('region')).toHaveAccessibleName(/1 de 6: Portada/);

      await page.getByRole('button', { name: 'Reanudar' }).click();
      await expect(page.getByRole('region')).toHaveAccessibleName(/2 de 6: Tiempo juntos/, { timeout: 8000 });
    });

    test('se toca a los lados para pasar y la barra avanza sola a los 5 segundos', async ({ page }) => {
      await entrarConSesion(page);
      await simularBackend(page);

      await page.goto(`/viajes/${VIAJE_ID}/resumen`);
      await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();

      const derecha = await punto(page, 0.85);
      await page.mouse.click(derecha.x, derecha.y);
      await expect(page.getByRole('region')).toHaveAccessibleName(/2 de 6/);

      const izquierda = await punto(page, 0.1);
      await page.mouse.click(izquierda.x, izquierda.y);
      await expect(page.getByRole('region')).toHaveAccessibleName(/1 de 6/);

      await expect(page.getByRole('region')).toHaveAccessibleName(/2 de 6/, { timeout: 12000 });
    });

    test('al mantener pulsado y arrastrar se ve la historia vecina; al soltar se cambia, y si se devuelve a su sitio no', async ({ page }) => {
      await entrarConSesion(page);
      await simularBackend(page);

      await page.goto(`/viajes/${VIAJE_ID}/resumen`);
      await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();
      const inicio = await punto(page, 0.8);
      const fin = await punto(page, 0.15);

      await page.mouse.move(inicio.x, inicio.y);
      await page.mouse.down();
      await page.mouse.move(fin.x, fin.y, { steps: 8 });
      // En WebKit la caja de un elemento con giro 3D se mide con ancho 0 y Playwright lo da por oculto: basta con que esté en el DOM
      await expect(page.getByText('días de aventura')).toBeAttached();
      await page.mouse.move(inicio.x, inicio.y, { steps: 8 });
      await page.mouse.up();
      await expect(page.getByRole('region')).toHaveAccessibleName(/1 de 6/);
      await expect(page.locator('[style*="preserve-3d"]')).toHaveCount(0);

      await page.mouse.move(inicio.x, inicio.y);
      await page.mouse.down();
      await page.mouse.move(fin.x, fin.y, { steps: 8 });
      await page.mouse.up();
      await expect(page.getByRole('region')).toHaveAccessibleName(/2 de 6/);
      await expect(page.getByText('días de aventura')).toBeVisible();
    });
  });
});
