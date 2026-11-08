import { test, expect, type Page, type Route, type WebSocketRoute } from '@playwright/test';

const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';

const sesion = {
  usuario: {
    id: USUARIO_ID,
    nombre: 'Adriana',
    email: 'adriana@travelwrap.app',
    avatar_url: null,
    creado_en: '2026-10-06T15:29:32Z',
  },
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

type Opcion = { id: string; texto: string; valor_fecha: null; orden: number };

// Backend simulado en memoria: un viaje pendiente de destino con su votación de destino. Berta ya ha votado Praga
const simularBackend = async (page: Page) => {
  const viaje = {
    id: 'verano',
    nombre: 'Verano 2027',
    destino: null as string | null,
    descripcion: null,
    fecha_inicio: null,
    fecha_fin: null,
    moneda: 'EUR',
    presupuesto: 900,
    estado: 'activo',
    creado_en: '2026-10-12T10:00:00Z',
    pendiente_destino: true,
    rol: 'creador',
    miembros: [
      { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
      { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
    ],
  };
  const votacion = {
    id: 'destino',
    titulo: '¿A dónde queremos ir?',
    tipo: 'destino',
    estado: 'abierta',
    opcion_ganadora_id: null as string | null,
    opciones: [{ id: 'praga', texto: 'Praga', valor_fecha: null, orden: 0 }] as Opcion[],
    votos: { u2: 'praga' } as Record<string, string>,
  };
  const formatear = () => {
    const votos = Object.entries(votacion.votos);
    return {
      ...votacion,
      votos: undefined,
      descripcion: null,
      creado_por: USUARIO_ID,
      creado_en: '2026-10-12T10:00:00Z',
      cerrada_en: votacion.estado === 'cerrada' ? '2026-10-22T10:00:00Z' : null,
      opciones: votacion.opciones.map((o) => {
        const votantes = votos.filter(([, op]) => op === o.id).map(([u]) => u);
        return { ...o, votos: votantes.length, votantes };
      }),
      total_votos: votos.length,
      total_miembros: viaje.miembros.length,
      todos_han_votado: viaje.miembros.every((m) => votacion.votos[m.usuario_id] !== undefined),
      mi_voto: votacion.votos[USUARIO_ID] ?? null,
    };
  };

  await page.route('**/api/viajes**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    const metodo = peticion.method();

    if (ruta === '/viajes') return json(route, 200, { viajes: [viaje] });
    if (ruta === '/viajes/verano') return json(route, 200, viaje);
    if (ruta === '/viajes/verano/votaciones') return json(route, 200, { votaciones: [formatear()] });
    if (ruta === '/viajes/verano/votaciones/destino' && metodo === 'GET') return json(route, 200, formatear());
    if (ruta.endsWith('/opciones')) {
      const { texto } = peticion.postDataJSON();
      votacion.opciones.push({ id: texto.toLowerCase(), texto, valor_fecha: null, orden: votacion.opciones.length });
      return json(route, 201, formatear());
    }
    if (ruta.endsWith('/voto') && metodo === 'PUT') {
      votacion.votos[USUARIO_ID] = peticion.postDataJSON().opcion_id;
      return json(route, 200, formatear());
    }
    if (ruta.endsWith('/cerrar')) {
      votacion.estado = 'cerrada';
      votacion.opcion_ganadora_id = 'praga';
      Object.assign(viaje, { destino: 'Praga', pendiente_destino: false });
      return json(route, 200, { votacion: formatear(), hubo_empate: false, destino: 'Praga' });
    }
    return json(route, 404, { error: { codigo: 'no_encontrado', mensaje: 'No encontrado' } });
  });

  return { viaje, votacion };
};

// Servidor de Socket.io simulado (namespace /votaciones) hablando su protocolo sobre WebSocket:
// abre la conexión, acepta el namespace, apunta a qué viajes se une el cliente y le envía avisos
const simularTiempoReal = async (page: Page) => {
  const unidos: string[] = [];
  const conexion: { ws: WebSocketRoute | null } = { ws: null };

  await page.routeWebSocket(/\/socket\.io\//, (ws) => {
    conexion.ws = ws;
    ws.send(`0${JSON.stringify({ sid: 'e2e', upgrades: [], pingInterval: 25000, pingTimeout: 60000, maxPayload: 1000000 })}`);
    ws.onMessage((mensaje) => {
      const texto = String(mensaje);
      if (texto.startsWith('40/votaciones')) {
        ws.send('40/votaciones,{"sid":"e2e-votaciones"}');
      } else if (texto.startsWith('42/votaciones,')) {
        const [evento, datos] = JSON.parse(texto.slice('42/votaciones,'.length));
        if (evento === 'unirse_viaje') unidos.push(datos.viaje_id);
      }
    });
  });

  return {
    unidos,
    avisar: (cambio: Record<string, unknown>) =>
      conexion.ws?.send(`42/votaciones,${JSON.stringify(['votacion_cambiada', cambio])}`),
  };
};

test.describe('Votación del destino', () => {
  test('se proponen y votan destinos, el creador fija el ganador y el viaje queda con destino', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    // Desde Mis viajes, un viaje pendiente lleva a elegir su destino
    await page.goto('/');
    await page.getByRole('button', { name: /Verano 2027/ }).click();
    await expect(page).toHaveURL(/\/viajes\/verano\/destino$/);
    await expect(page.getByText('1/2')).toBeVisible();
    // RF9: hasta que no vota Adriana no se puede fijar el destino
    await expect(page.getByRole('button', { name: 'Fijar «Praga» como destino' })).toBeDisabled();

    await page.getByLabel('Proponer destino').fill('Lisboa');
    await page.getByRole('button', { name: 'Añadir' }).click();
    await expect(page.getByRole('radio', { name: /Lisboa/ })).toBeVisible();

    // Votar Lisboa empata con Praga; cambiar el voto a Praga deja una mayoría clara
    await page.getByRole('radio', { name: /Lisboa/ }).click();
    await expect(page.getByRole('button', { name: 'Fijar destino (hay empate)' })).toBeVisible();
    await page.getByRole('radio', { name: /Praga/ }).click();
    await expect(page.getByRole('radio', { name: /Praga/ })).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('button', { name: 'Fijar «Praga» como destino' }).click();
    await page.getByRole('button', { name: 'Confirmar Praga' }).click();

    // Con el destino fijado se pasa al inicio del viaje, y la votación aparece cerrada con su ganador
    await expect(page).toHaveURL(/\/viajes\/verano$/);
    await page.getByRole('button', { name: 'Votaciones' }).click();
    await expect(page.getByRole('region', { name: '¿A dónde queremos ir?' })).toContainText('Ganó: Praga');
  });
});

// Viaje con destino y sin votaciones: POST crea la votación y GET devuelve la lista
const simularBackendConDestino = async (page: Page) => {
  const viaje = {
    id: 'roma',
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
    miembros: [
      { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
      { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
    ],
  };
  const votaciones: unknown[] = [];
  const recibidas: unknown[] = [];

  await page.route('**/api/viajes**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');

    if (ruta === '/viajes') return json(route, 200, { viajes: [viaje] });
    if (ruta === '/viajes/roma') return json(route, 200, viaje);
    if (ruta === '/viajes/roma/votaciones' && peticion.method() === 'POST') {
      const datos = peticion.postDataJSON();
      recibidas.push(datos);
      const nueva = {
        id: `votacion-${votaciones.length + 1}`,
        titulo: datos.titulo,
        descripcion: null,
        tipo: datos.tipo,
        estado: 'abierta',
        opcion_ganadora_id: null,
        creado_por: USUARIO_ID,
        creado_en: '2026-10-27T10:00:00Z',
        cerrada_en: null,
        opciones: datos.opciones.map((o: { texto: string; valor_fecha: string | null }, i: number) => ({
          id: `opcion-${i + 1}`,
          ...o,
          orden: i,
          votos: 0,
          votantes: [],
        })),
        total_votos: 0,
        total_miembros: viaje.miembros.length,
        todos_han_votado: false,
        mi_voto: null,
      };
      votaciones.unshift(nueva);
      return json(route, 201, nueva);
    }
    if (ruta === '/viajes/roma/votaciones') return json(route, 200, { votaciones });
    return json(route, 404, { error: { codigo: 'no_encontrado', mensaje: 'No encontrado' } });
  });

  return { recibidas };
};

test.describe('Crear una votación', () => {
  test('desde las votaciones del viaje se crea una votación de fechas y aparece la primera de la lista', async ({ page }) => {
    await entrarConSesion(page);
    const { recibidas } = await simularBackendConDestino(page);

    await page.goto('/viajes/roma');
    await page.getByRole('button', { name: 'Votaciones' }).click();
    await expect(page.getByText('Todavía no hay votaciones en este viaje.')).toBeVisible();
    await page.getByRole('button', { name: 'Crear nueva votación' }).click();
    await expect(page).toHaveURL(/\/viajes\/roma\/votaciones\/nueva$/);

    await page.getByLabel('Pregunta de la votación').fill('¿Qué fin de semana salimos?');
    await page.getByLabel('Opción A', { exact: true }).fill('12 – 15 mayo');
    await page.getByLabel('Fecha de la opción A').fill('2027-05-12');
    await page.getByLabel('Opción B', { exact: true }).fill('19 – 22 mayo');
    await page.getByRole('button', { name: 'Publicar votación' }).click();

    // Vuelve a la lista con la votación nueva, abierta y lista para votar
    await expect(page).toHaveURL(/\/viajes\/roma\/votaciones$/);
    const votacion = page.getByRole('region', { name: '¿Qué fin de semana salimos?' });
    await expect(votacion.getByRole('radio')).toHaveCount(2);
    await expect(votacion.getByText('0/2')).toBeVisible();
    expect(recibidas).toEqual([
      {
        titulo: '¿Qué fin de semana salimos?',
        tipo: 'fecha',
        opciones: [
          { texto: '12 – 15 mayo', valor_fecha: '2027-05-12' },
          { texto: '19 – 22 mayo', valor_fecha: null },
        ],
      },
    ]);

    // Al volver atrás no se regresa al formulario ya enviado
    await page.goBack();
    await expect(page).toHaveURL(/\/viajes\/roma$/);
  });

  test('a 320 px de ancho el formulario cabe sin scroll horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await entrarConSesion(page);
    await simularBackendConDestino(page);

    await page.goto('/viajes/roma/votaciones/nueva');
    await page.getByRole('button', { name: 'Añadir opción' }).click();
    await expect(page.getByLabel('Opción C', { exact: true })).toBeVisible();

    const anchoContenido = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(anchoContenido).toBeLessThanOrEqual(320);
  });
});

test.describe('Votaciones en tiempo real', () => {
  test('las propuestas y votos de los demás aparecen sin recargar y, al fijar el destino, todos pasan al viaje', async ({ page }) => {
    await entrarConSesion(page);
    const { viaje, votacion } = await simularBackend(page);
    viaje.rol = 'miembro';
    const servidor = await simularTiempoReal(page);

    await page.goto('/viajes/verano/destino');
    await expect(page.getByText('1/2')).toBeVisible();
    await expect.poll(() => servidor.unidos).toEqual(['verano']);

    // Berta propone Roma y cambia su voto a Roma desde su móvil
    votacion.opciones.push({ id: 'roma', texto: 'Roma', valor_fecha: null, orden: 1 });
    votacion.votos.u2 = 'roma';
    servidor.avisar({ viaje_id: 'verano', votacion_id: 'destino', motivo: 'opcion' });

    const roma = page.getByRole('radio', { name: /Roma/ });
    await expect(roma).toBeVisible();
    await expect(roma).toContainText('1 voto');
    await expect(page.getByRole('radio', { name: /Praga/ })).toContainText('0 votos');

    // Se une Daniel con el enlace: aparece sin recargar y ya no han votado todos
    viaje.miembros.push({ usuario_id: 'u3', nombre: 'Daniel', avatar_url: null, rol: 'miembro' });
    servidor.avisar({ viaje_id: 'verano', motivo: 'miembros' });
    await expect(page.getByText('1/3')).toBeVisible();

    // El creador fija Roma: quien está en «Elegir destino» pasa solo al inicio del viaje
    Object.assign(viaje, { destino: 'Roma', pendiente_destino: false });
    servidor.avisar({ viaje_id: 'verano', votacion_id: 'destino', motivo: 'cerrada', destino: 'Roma' });

    await expect(page).toHaveURL(/\/viajes\/verano$/);
  });
});
