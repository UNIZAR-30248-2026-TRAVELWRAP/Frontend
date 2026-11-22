import { test, expect, type Page, type Route, type WebSocketRoute } from '@playwright/test';

const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000';

const sesion = {
  usuario: { id: USUARIO_ID, nombre: 'Adriana', email: 'adriana@travelwrap.app', avatar_url: null, creado_en: '2026-10-06T15:29:32Z' },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

// Sesión iniciada, el chat de un viaje (la pantalla en la que se espera el aviso) y las demás pantallas vacías
const prepararApp = async (page: Page) => {
  await page.addInitScript((datos) => {
    localStorage.setItem('travelwrap.sesion', JSON.stringify(datos));
  }, sesion);
  await page.route('**/api/auth/refresh', (route) =>
    json(route, 200, { token: sesion.token, refresh_token: sesion.refresh_token }),
  );
  await page.route(`**/api/viajes/${VIAJE_ID}`, (route) =>
    json(route, 200, {
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
      archivado: false,
      portada_url: null,
      miembros: [{ usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'miembro' }],
    }),
  );
  await page.route(`**/api/viajes/${VIAJE_ID}/mensajes`, (route) => json(route, 200, { mensajes: [] }));
};

// Servidor de Socket.io simulado: acepta cualquier namespace y envía avisos por /notificaciones
const simularAvisos = async (page: Page) => {
  const conexiones: WebSocketRoute[] = [];
  await page.routeWebSocket(/\/socket\.io\//, (ws) => {
    conexiones.push(ws);
    ws.send(`0${JSON.stringify({ sid: 'e2e', upgrades: [], pingInterval: 25000, pingTimeout: 60000, maxPayload: 1000000 })}`);
    ws.onMessage((datos) => {
      const conexion = /^40(\/[a-z]+)/.exec(String(datos));
      if (conexion) ws.send(`40${conexion[1]},{"sid":"e2e${conexion[1]}"}`);
    });
  });
  return {
    llegar: (aviso: Record<string, unknown>) =>
      conexiones.forEach((ws) => ws.send(`42/notificaciones,${JSON.stringify(['notificacion', aviso])}`)),
  };
};

const aviso = (tipo: string, pantalla: string, texto: string) => ({
  viaje_id: VIAJE_ID,
  viaje_nombre: 'Roma 2027',
  tipo,
  pantalla,
  texto,
});

test.describe('Avisos de eventos del viaje', () => {
  test('un gasto nuevo muestra el aviso con el viaje y el motivo, y al tocarlo abre los gastos', async ({ page }) => {
    await prepararApp(page);
    const avisos = await simularAvisos(page);
    await page.goto(`/viajes/${VIAJE_ID}/chat`);
    await expect(page.getByRole('list', { name: 'Mensajes' })).toBeAttached();

    await expect(async () => {
      avisos.llegar(aviso('gasto', 'gastos', 'Berta ha registrado un gasto: Cena'));
      await expect(page.getByRole('status')).toContainText('Roma 2027', { timeout: 500 });
    }).toPass();
    await expect(page.getByRole('status')).toContainText('Berta ha registrado un gasto: Cena');

    await page.getByRole('button', { name: /Abrir$/ }).click();

    await expect(page).toHaveURL(`/viajes/${VIAJE_ID}/gastos`);
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('una tarea nueva lleva a la lista de tareas', async ({ page }) => {
    await prepararApp(page);
    const avisos = await simularAvisos(page);
    await page.goto(`/viajes/${VIAJE_ID}/chat`);

    await expect(async () => {
      avisos.llegar(aviso('tarea', 'tareas', 'Berta ha añadido una tarea: Comprar billetes'));
      await expect(page.getByRole('status')).toContainText('Comprar billetes', { timeout: 500 });
    }).toPass();
    await page.getByRole('button', { name: /Abrir$/ }).click();

    await expect(page).toHaveURL(`/viajes/${VIAJE_ID}/documentos?pestana=tareas`);
  });

  test('el aviso se puede cerrar y no sale si ya estás viendo esa pantalla', async ({ page }) => {
    await prepararApp(page);
    const avisos = await simularAvisos(page);
    await page.goto(`/viajes/${VIAJE_ID}/chat`);

    // Un mensaje nuevo mientras estás en el chat del viaje no avisa
    avisos.llegar(aviso('mensaje', 'chat', 'Berta ha enviado un mensaje: Hola'));
    await expect(page.getByRole('status')).toHaveCount(0);

    await expect(async () => {
      avisos.llegar(aviso('votacion', 'votaciones', 'Berta ha creado una votación: ¿Dónde cenamos?'));
      await expect(page.getByRole('status')).toBeVisible({ timeout: 500 });
    }).toPass();
    await page.getByRole('button', { name: 'Cerrar aviso' }).click();

    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page).toHaveURL(`/viajes/${VIAJE_ID}/chat`);
  });
});
