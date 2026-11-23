import { test, expect, type Page, type Route } from '@playwright/test';

// Presupuesto que se va restando (PB-61): la pantalla principal muestra lo que queda según los gastos del viaje
const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA_ID = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f';
const VIAJE_ID = 'roma';

const sesion = {
  usuario: { id: USUARIO_ID, nombre: 'Adriana', email: EMAIL, avatar_url: null, creado_en: '2026-10-06T15:29:32Z' },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
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
  rol: 'creador',
  archivado: false,
  miembros: [
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: BERTA_ID, nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
};

// API simulada: el viaje y su resumen. El gastado se lee de una variable que el test cambia, como haría un gasto nuevo
const simularViaje = async (page: Page, gastado: { valor: number }) => {
  await page.route(`**/api/viajes/${VIAJE_ID}`, (route) => json(route, 200, viaje));
  await page.route(`**/api/viajes/${VIAJE_ID}/gastos/balance`, (route) => json(route, 200, { saldos: [], total: 0 }));
  await page.route(`**/api/viajes/${VIAJE_ID}/resumen`, (route) => {
    const restante = Math.round((viaje.presupuesto - gastado.valor) * 100) / 100;
    return json(route, 200, {
      dias: 4,
      actividad_mas_votada: null,
      alma_del_grupo: null,
      presupuesto: { total: viaje.presupuesto, gastado: gastado.valor, restante },
    });
  });
};

test.describe('Presupuesto restante', () => {
  test('la pantalla principal muestra lo gastado y el porcentaje del presupuesto', async ({ page }) => {
    await entrarConSesion(page);
    await simularViaje(page, { valor: 310 });

    await page.goto(`/viajes/${VIAJE_ID}`);

    await expect(page.getByTestId('presupuesto-progreso')).toContainText('Gastado 310 €');
    await expect(page.getByTestId('presupuesto-progreso')).toContainText('36%');
  });

  test('el porcentaje sube cuando se registran gastos', async ({ page }) => {
    await entrarConSesion(page);
    const gastado = { valor: 310 };
    await simularViaje(page, gastado);

    await page.goto(`/viajes/${VIAJE_ID}`);
    await expect(page.getByTestId('presupuesto-progreso')).toContainText('36%');

    // Se registra un gasto de 100 € en el backend y se vuelve a la pantalla principal
    gastado.valor = 410;
    await page.goto(`/viajes/${VIAJE_ID}`);

    await expect(page.getByTestId('presupuesto-progreso')).toContainText('Gastado 410 €');
    await expect(page.getByTestId('presupuesto-progreso')).toContainText('48%');
  });

  test('si se supera el presupuesto la barra llega al 100 %', async ({ page }) => {
    await entrarConSesion(page);
    await simularViaje(page, { valor: 910 });

    await page.goto(`/viajes/${VIAJE_ID}`);

    await expect(page.getByTestId('presupuesto-progreso')).toContainText('100%');
  });
});
