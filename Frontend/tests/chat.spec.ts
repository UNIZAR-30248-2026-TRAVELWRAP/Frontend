import { test, expect, type Page, type Route, type WebSocketRoute } from '@playwright/test';

const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000';

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

const json = (route: Route, status: number, cuerpo?: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: cuerpo === undefined ? '' : JSON.stringify(cuerpo) });

const viaje = (estado: string) => ({
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 850,
  estado,
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'miembro',
  archivado: false,
  miembros: [
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: 'otro', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
});

const mensaje = (id: string, texto: string, autorId = 'otro', nombre = 'Berta', creadoEn = '2026-05-12T10:00:00Z') => ({
  id,
  texto,
  creado_en: creadoEn,
  autor: { usuario_id: autorId, nombre, avatar_url: null },
});

// API simulada del viaje y del chat. Devuelve los textos que la pantalla ha enviado
const simularChat = async (page: Page, { estado = 'activo', historial = [mensaje('m1', 'Hola a todos')] } = {}) => {
  const enviados: string[] = [];
  await page.route(`**/api/viajes/${VIAJE_ID}`, (route) => json(route, 200, viaje(estado)));
  await page.route(`**/api/viajes/${VIAJE_ID}/mensajes`, (route) => {
    const peticion = route.request();
    if (peticion.method() === 'POST') {
      const { texto } = peticion.postDataJSON() as { texto: string };
      enviados.push(texto);
      return json(route, 201, mensaje(`nuevo-${enviados.length}`, texto, USUARIO_ID, 'Adriana', '2026-05-12T10:05:00Z'));
    }
    return json(route, 200, { mensajes: historial });
  });
  return enviados;
};

// Servidor de Socket.io simulado (namespace /chat), igual que en el E2E de votaciones: acepta el namespace, anota a
// qué viajes se une el cliente y envía mensajes a todas sus conexiones
const simularTiempoReal = async (page: Page) => {
  const unidos: string[] = [];
  const conexiones: WebSocketRoute[] = [];

  await page.routeWebSocket(/\/socket\.io\//, (ws) => {
    conexiones.push(ws);
    ws.send(`0${JSON.stringify({ sid: 'e2e', upgrades: [], pingInterval: 25000, pingTimeout: 60000, maxPayload: 1000000 })}`);
    ws.onMessage((datos) => {
      const texto = String(datos);
      if (texto.startsWith('40/chat')) {
        ws.send('40/chat,{"sid":"e2e-chat"}');
      } else if (texto.startsWith('42/chat,')) {
        const [evento, cuerpo] = JSON.parse(texto.slice('42/chat,'.length));
        if (evento === 'unirse_viaje') unidos.push(cuerpo.viaje_id);
      }
    });
  });

  return {
    unidos,
    llegar: (datos: Record<string, unknown>) =>
      conexiones.forEach((ws) => ws.send(`42/chat,${JSON.stringify(['mensaje', datos])}`)),
  };
};

test.describe('Chat del grupo', () => {
  test('el historial muestra los mensajes del grupo y enviar uno lo añade a la conversación', async ({ page }) => {
    await entrarConSesion(page);
    await simularTiempoReal(page);
    const enviados = await simularChat(page);

    await page.goto(`/viajes/${VIAJE_ID}/chat`);
    const conversacion = page.getByRole('list', { name: 'Mensajes' });
    await expect(conversacion).toContainText('Hola a todos');

    await page.getByLabel('Mensaje', { exact: true }).fill('Nos vemos a las 10');
    await page.getByRole('button', { name: 'Enviar' }).click();

    await expect(conversacion).toContainText('Nos vemos a las 10');
    expect(enviados).toEqual(['Nos vemos a las 10']);
  });

  test('un mensaje que llega por el socket aparece sin recargar la pantalla', async ({ page }) => {
    await entrarConSesion(page);
    const tiempoReal = await simularTiempoReal(page);
    await simularChat(page);

    await page.goto(`/viajes/${VIAJE_ID}/chat`);
    await expect.poll(() => tiempoReal.unidos).toContain(VIAJE_ID);
    tiempoReal.llegar({ viaje_id: VIAJE_ID, mensaje: mensaje('m9', '¡Llego mañana!') });

    await expect(page.getByRole('list', { name: 'Mensajes' })).toContainText('¡Llego mañana!');
  });

  test('en un viaje finalizado el chat es de solo lectura', async ({ page }) => {
    await entrarConSesion(page);
    await simularTiempoReal(page);
    await simularChat(page, { estado: 'finalizado' });

    await page.goto(`/viajes/${VIAJE_ID}/chat`);

    await expect(page.getByLabel('Mensaje', { exact: true })).toBeDisabled();
    await expect(page.getByText('El viaje está finalizado: el chat es de solo lectura.')).toBeVisible();
  });
});
