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
  estado: 'archivado',
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
  gasto_total: 178,
  gasto_mayor: { concepto: 'Cena Trastevere', importe: 120.5 },
  actividad_mas_votada: { titulo: 'Coliseo', votos: 3 },
  alma_del_grupo: { usuario_id: BERTA_ID, nombre: 'Berta', pagos: 2, planes_propuestos: 4, fotos_subidas: 1 },
};

const SALDOS = [
  { usuario_id: BERTA_ID, nombre: 'Berta', pagado: 178, parte: 89, saldo: 89 },
  { usuario_id: USUARIO_ID, nombre: 'Adriana', pagado: 0, parte: 89, saldo: -89 },
];

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

const simularBackend = async (page: Page, { fallaResumen = false }: { fallaResumen?: boolean } = {}) => {
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
        : json(route, 200, RESUMEN);
    }
    if (ruta === `/viajes/${VIAJE_ID}/fotos`) return json(route, 200, { fotos: [foto] });
    if (ruta === `/viajes/${VIAJE_ID}/gastos/balance`) return json(route, 200, { saldos: SALDOS });
    return json(route, 200, viaje);
  });
};

const sinDesbordamiento = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('Resumen de fin de viaje (Wrap)', () => {
  test.use({ reducedMotion: 'reduce' });

  test('recorre las siete diapositivas y termina en Mis viajes', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto(`/viajes/${VIAJE_ID}/resumen`);

    await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();
    await expect(page.getByRole('region')).toHaveAccessibleName(/1 de 7: Portada/);

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('días de aventura')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText(/Cena Trastevere/)).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('3 votos')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('list', { name: 'Estadísticas de Berta' })).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByAltText('coliseo.jpg')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('Adriana paga a Berta')).toBeVisible();

    await page.getByRole('button', { name: 'Ir a Mis viajes' }).click();
    await expect(page).toHaveURL(/\/$/);
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

    test('se toca a los lados para pasar y la barra avanza sola a los 5 segundos', async ({ page }) => {
      await entrarConSesion(page);
      await simularBackend(page);

      await page.goto(`/viajes/${VIAJE_ID}/resumen`);
      await expect(page.getByRole('heading', { name: 'Roma' })).toBeVisible();

      const derecha = await punto(page, 0.85);
      await page.mouse.click(derecha.x, derecha.y);
      await expect(page.getByRole('region')).toHaveAccessibleName(/2 de 7/);

      const izquierda = await punto(page, 0.1);
      await page.mouse.click(izquierda.x, izquierda.y);
      await expect(page.getByRole('region')).toHaveAccessibleName(/1 de 7/);

      await expect(page.getByRole('region')).toHaveAccessibleName(/2 de 7/, { timeout: 12000 });
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
      await expect(page.getByText('días de aventura')).toBeVisible();
      await page.mouse.move(inicio.x, inicio.y, { steps: 8 });
      await page.mouse.up();
      await expect(page.getByRole('region')).toHaveAccessibleName(/1 de 7/);

      await page.mouse.move(inicio.x, inicio.y);
      await page.mouse.down();
      await page.mouse.move(fin.x, fin.y, { steps: 8 });
      await page.mouse.up();
      await expect(page.getByRole('region')).toHaveAccessibleName(/2 de 7/);
      await expect(page.getByText('días de aventura')).toBeVisible();
    });
  });
});
