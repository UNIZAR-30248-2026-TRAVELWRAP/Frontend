// Pasos para votar, cerrar votaciones y fijar el destino (PB-19, PB-20 y PB-21).
// Simulan un backend con el viaje, sus votaciones y los votos de cada miembro, y el servidor de tiempo real
// (Socket.io, namespace /votaciones) para que los cambios de otros miembros lleguen sin recargar.
// Usan la página de login.steps.ts y sus pasos de botones, diálogos y mensajes
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect, type Route, type WebSocketRoute } from '@playwright/test';
import { paginaActual } from './login.steps';

const YO = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA = 'berta';

type Miembro = { usuario_id: string; nombre: string; avatar_url: null; rol: 'creador' | 'miembro' };
type Votacion = {
  id: string;
  titulo: string;
  tipo: 'fecha' | 'actividad' | 'destino';
  estado: 'abierta' | 'cerrada';
  opcion_ganadora_id: string | null;
  opciones: { id: string; texto: string; valor_fecha: null; orden: number }[];
  // usuario → opción votada
  votos: Record<string, string>;
};

type Viaje = {
  id: string;
  nombre: string;
  destino: string | null;
  estado: 'activo' | 'archivado';
  rol: 'creador' | 'miembro';
  miembros: Miembro[];
};

let viaje: Viaje | null = null;
let votaciones: Votacion[] = [];
let votosRecibidos = 0;
let cierresRecibidos = 0;
let rechazaVotos = false;
let tiempoReal: WebSocketRoute | null = null;
let rutasRegistradas = false;

Before(() => {
  viaje = null;
  votaciones = [];
  votosRecibidos = 0;
  cierresRecibidos = 0;
  rechazaVotos = false;
  tiempoReal = null;
  rutasRegistradas = false;
});

const elViaje = () => {
  expect(viaje, 'el viaje no está preparado').not.toBeNull();
  return viaje as Viaje;
};

const laVotacion = (titulo: string) => {
  const votacion = votaciones.find((v) => v.titulo === titulo);
  expect(votacion, `la votación "${titulo}" no está preparada`).toBeDefined();
  return votacion as Votacion;
};

const laOpcion = (votacion: Votacion, texto: string) => {
  const opcion = votacion.opciones.find((o) => o.texto === texto);
  expect(opcion, `la opción "${texto}" no está en "${votacion.titulo}"`).toBeDefined();
  return opcion as Votacion['opciones'][number];
};

const anadirOpcion = (votacion: Votacion, texto: string) => {
  votacion.opciones.push({ id: `${votacion.id}-${votacion.opciones.length + 1}`, texto, valor_fecha: null, orden: votacion.opciones.length });
};

const formatearViaje = () => {
  const v = elViaje();
  return {
    ...v,
    descripcion: null,
    fecha_inicio: '2027-05-12',
    fecha_fin: '2027-05-15',
    moneda: 'EUR',
    presupuesto: 900,
    creado_en: '2026-10-12T10:00:00Z',
    pendiente_destino: v.estado === 'activo' && v.destino === null,
  };
};

// La votación en el formato de la API, con los votos, los votantes y el voto del usuario de la sesión
const formatear = (votacion: Votacion) => {
  const votos = Object.entries(votacion.votos);
  const miembros = elViaje().miembros;
  return {
    id: votacion.id,
    titulo: votacion.titulo,
    descripcion: null,
    tipo: votacion.tipo,
    estado: votacion.estado,
    opcion_ganadora_id: votacion.opcion_ganadora_id,
    creado_por: YO,
    creado_en: '2026-10-27T10:00:00Z',
    cerrada_en: votacion.estado === 'cerrada' ? '2026-10-28T10:00:00Z' : null,
    opciones: votacion.opciones.map((o) => {
      const votantes = votos.filter(([, opcion]) => opcion === o.id).map(([usuario]) => usuario);
      return { ...o, votos: votantes.length, votantes };
    }),
    total_votos: votos.length,
    total_miembros: miembros.length,
    todos_han_votado: miembros.every((m) => votacion.votos[m.usuario_id] !== undefined),
    mi_voto: votacion.votos[YO] ?? null,
  };
};

// Gana la más votada; con empate, el backend elige una al azar (aquí, la primera de las empatadas)
const cerrar = (votacion: Votacion) => {
  const cuenta = (id: string) => Object.values(votacion.votos).filter((o) => o === id).length;
  const maximo = Math.max(...votacion.opciones.map((o) => cuenta(o.id)));
  const empatadas = votacion.opciones.filter((o) => cuenta(o.id) === maximo);
  votacion.estado = 'cerrada';
  votacion.opcion_ganadora_id = empatadas[0].id;
  const destino = votacion.tipo === 'destino' ? empatadas[0].texto : null;
  if (destino) elViaje().destino = destino;
  return { hubo_empate: empatadas.length > 1, destino };
};

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const error = (route: Route, status: number, codigo: string, mensaje: string) =>
  json(route, status, { error: { codigo, mensaje } });

const responder = async (route: Route) => {
  const peticion = route.request();
  const metodo = peticion.method();
  const v = elViaje();
  const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
  const [, , viajeId, seccion, votacionId, accion] = ruta.split('/');

  if (ruta === '/viajes') return json(route, 200, { viajes: [formatearViaje()] });
  if (viajeId !== v.id) return error(route, 404, 'viaje_no_encontrado', 'El viaje no existe o no perteneces a él');
  if (!seccion) return json(route, 200, formatearViaje());
  if (seccion !== 'votaciones') return json(route, 200, {});
  if (!votacionId) return json(route, 200, { votaciones: votaciones.map(formatear) });

  const votacion = votaciones.find((x) => x.id === votacionId);
  if (!votacion) return error(route, 404, 'votacion_no_encontrada', 'La votación no existe');
  if (!accion) return json(route, 200, formatear(votacion));
  if (v.estado !== 'activo') return error(route, 409, 'viaje_no_activo', 'El viaje está finalizado y ya no se puede modificar');
  if (votacion.estado === 'cerrada') return error(route, 409, 'votacion_cerrada', 'La votación ya está cerrada');

  if (accion === 'voto' && metodo === 'PUT') {
    votosRecibidos += 1;
    if (rechazaVotos) return error(route, 409, 'votacion_cerrada', 'La votación ya está cerrada');
    votacion.votos[YO] = peticion.postDataJSON().opcion_id;
    return json(route, 200, formatear(votacion));
  }
  if (accion === 'opciones' && metodo === 'POST') {
    anadirOpcion(votacion, peticion.postDataJSON().texto);
    return json(route, 201, formatear(votacion));
  }
  if (accion === 'cerrar' && metodo === 'POST') {
    cierresRecibidos += 1;
    if (v.rol !== 'creador') return error(route, 403, 'no_creador', 'Solo el creador del viaje puede cerrar votaciones');
    const { hubo_empate, destino } = cerrar(votacion);
    return json(route, 200, { votacion: formatear(votacion), hubo_empate, destino });
  }
  return error(route, 404, 'no_encontrado', 'No encontrado');
};

// Servidor de Socket.io simulado: acepta el namespace /votaciones y permite enviar avisos de cambios
const simular = async () => {
  if (rutasRegistradas) return;
  rutasRegistradas = true;
  const pagina = paginaActual();
  await pagina.route('**/api/viajes**', responder);
  await pagina.routeWebSocket(/\/socket\.io\//, (ws) => {
    tiempoReal = ws;
    ws.send(`0${JSON.stringify({ sid: 'cucumber', upgrades: [], pingInterval: 25000, pingTimeout: 60000, maxPayload: 1000000 })}`);
    ws.onMessage((mensaje) => {
      if (String(mensaje).startsWith('40/votaciones')) ws.send('40/votaciones,{"sid":"cucumber-votaciones"}');
    });
  });
};

const avisar = async (cambio: Record<string, unknown>) => {
  await expect.poll(() => tiempoReal !== null, { message: 'la app no se ha conectado al tiempo real' }).toBe(true);
  tiempoReal?.send(`42/votaciones,${JSON.stringify(['votacion_cambiada', { viaje_id: elViaje().id, ...cambio }])}`);
};

const irA = (ruta: string) => paginaActual().goto(new URL(ruta, paginaActual().url()).toString());
const region = (titulo: string) => paginaActual().getByRole('region', { name: titulo });
const opcionEn = (titulo: string, texto: string) => region(titulo).getByRole('radio', { name: new RegExp(texto) });

// ── Preparación ──────────────────────────────────────────────────────────────

const crearViaje = async (nombre: string, rol: Viaje['rol'], destino: string | null) => {
  viaje = {
    id: 'viaje-1',
    nombre,
    destino,
    estado: 'activo',
    rol,
    miembros: [
      { usuario_id: YO, nombre: 'Adriana', avatar_url: null, rol },
      { usuario_id: BERTA, nombre: 'Berta', avatar_url: null, rol: rol === 'creador' ? 'miembro' : 'creador' },
    ],
  };
  await simular();
};

Given('que he creado el viaje {string} con destino {string}, en el que también está Berta', async (nombre: string, destino: string) => {
  await crearViaje(nombre, 'creador', destino);
});

Given('que Berta ha creado el viaje {string} con destino {string} y yo soy miembro', async (nombre: string, destino: string) => {
  await crearViaje(nombre, 'miembro', destino);
});

Given('que he creado el viaje {string} para votar el destino, con Berta como miembro', async (nombre: string) => {
  await crearViaje(nombre, 'creador', null);
  votaciones.push({ id: 'destino', titulo: '¿A dónde queremos ir?', tipo: 'destino', estado: 'abierta', opcion_ganadora_id: null, opciones: [], votos: {} });
});

Given('que el viaje tiene la votación de {word} {string} con las opciones {string} y {string}', (tipo: string, titulo: string, primera: string, segunda: string) => {
  const tipos: Record<string, Votacion['tipo']> = { fechas: 'fecha', actividades: 'actividad' };
  const votacion: Votacion = { id: `votacion-${votaciones.length + 1}`, titulo, tipo: tipos[tipo], estado: 'abierta', opcion_ganadora_id: null, opciones: [], votos: {} };
  anadirOpcion(votacion, primera);
  anadirOpcion(votacion, segunda);
  votaciones.push(votacion);
});

Given('que en la votación del destino están propuestos {string} y {string}', (primero: string, segundo: string) => {
  const votacion = laVotacion('¿A dónde queremos ir?');
  anadirOpcion(votacion, primero);
  anadirOpcion(votacion, segundo);
});

Given('que Berta ya ha votado {string} en {string}', (texto: string, titulo: string) => {
  const votacion = laVotacion(titulo);
  votacion.votos[BERTA] = laOpcion(votacion, texto).id;
});

Given('que ya he votado {string} en {string}', (texto: string, titulo: string) => {
  const votacion = laVotacion(titulo);
  votacion.votos[YO] = laOpcion(votacion, texto).id;
});

Given('que la votación {string} ya está cerrada', (titulo: string) => {
  cerrar(laVotacion(titulo));
});

Given('que en realidad la creadora del viaje es Berta y yo solo soy miembro', () => {
  const v = elViaje();
  v.rol = 'miembro';
  for (const m of v.miembros) m.rol = m.usuario_id === BERTA ? 'creador' : 'miembro';
});

Given('que el viaje está archivado', () => {
  elViaje().estado = 'archivado';
});

Given('que el servidor rechaza los votos porque la votación se acaba de cerrar', () => {
  rechazaVotos = true;
});

// ── Acciones ─────────────────────────────────────────────────────────────────

When('entro en las votaciones del viaje', async () => {
  await irA(`/viajes/${elViaje().id}/votaciones`);
  await expect(paginaActual().getByRole('tablist', { name: 'Filtrar votaciones' })).toBeVisible();
});

When('voto {string} en la votación {string}', async (texto: string, titulo: string) => {
  await opcionEn(titulo, texto).click();
  await region(titulo).getByRole('button', { name: /^(Emitir voto|Cambiar voto)$/ }).click();
});

When('filtro las votaciones por {string}', async (filtro: string) => {
  await paginaActual().getByRole('tab', { name: filtro }).click();
});

When('pulso «Cerrar votación» en {string}', async (titulo: string) => {
  await region(titulo).getByRole('button', { name: 'Cerrar votación' }).click();
});

When('Berta vota {string} en {string} desde su móvil', async (texto: string, titulo: string) => {
  const votacion = laVotacion(titulo);
  votacion.votos[BERTA] = laOpcion(votacion, texto).id;
  await avisar({ votacion_id: votacion.id, motivo: 'voto' });
});

When('Berta propone {string} en {string} desde su móvil', async (texto: string, titulo: string) => {
  const votacion = laVotacion(titulo);
  anadirOpcion(votacion, texto);
  await avisar({ votacion_id: votacion.id, motivo: 'opcion' });
});

When('Berta cierra la votación {string} desde su móvil', async (titulo: string) => {
  const votacion = laVotacion(titulo);
  const { destino } = cerrar(votacion);
  await avisar({ votacion_id: votacion.id, motivo: 'cerrada', ...(destino ? { destino } : {}) });
});

When('abro el viaje pendiente {string} desde mis viajes', async (nombre: string) => {
  await irA('/');
  await paginaActual().getByRole('button', { name: new RegExp(nombre) }).click();
});

When('propongo el destino {string}', async (destino: string) => {
  await paginaActual().getByLabel('Proponer destino').fill(destino);
  await paginaActual().getByRole('button', { name: 'Añadir' }).click();
  await expect(paginaActual().getByRole('radio', { name: new RegExp(destino) })).toBeVisible();
});

When('voto el destino {string}', async (destino: string) => {
  const opcion = paginaActual().getByRole('radiogroup', { name: 'Destinos propuestos' }).getByRole('radio', { name: new RegExp(destino) });
  await opcion.click();
  await expect(opcion).toHaveAttribute('aria-checked', 'true');
});

// ── Comprobaciones ───────────────────────────────────────────────────────────

Then('la opción {string} de {string} tiene {int} voto(s) \\({int} %)', async (texto: string, titulo: string, votos: number, porcentaje: number) => {
  const opcion = opcionEn(titulo, texto);
  await expect(opcion).toContainText(`${votos} ${votos === 1 ? 'voto' : 'votos'}`);
  await expect(opcion).toContainText(`${porcentaje}%`);
});

Then('la opción {string} de {string} aparece como «Tu elección»', async (texto: string, titulo: string) => {
  await expect(opcionEn(titulo, texto)).toContainText('Tu elección');
});

Then('en {string} han votado {int} de {int} miembros', async (titulo: string, votantes: number, total: number) => {
  await expect(region(titulo)).toContainText(`${votantes}/${total} miembros han votado`);
});

Then('la votación {string} aparece como completa', async (titulo: string) => {
  await expect(region(titulo)).toContainText('Completo');
});

Then('veo la votación {string}', async (titulo: string) => {
  await expect(region(titulo)).toBeVisible();
});

Then('no veo la votación {string}', async (titulo: string) => {
  await expect(region(titulo)).toHaveCount(0);
});

Then('veo la opción {string} en {string}', async (texto: string, titulo: string) => {
  await expect(opcionEn(titulo, texto)).toBeVisible();
});

Then('el botón «Cerrar votación» de {string} está desactivado', async (titulo: string) => {
  await expect(region(titulo).getByRole('button', { name: 'Cerrar votación' })).toBeDisabled();
});

Then('no veo el botón «Cerrar votación» en {string}', async (titulo: string) => {
  await expect(region(titulo)).toBeVisible();
  await expect(region(titulo).getByRole('button', { name: 'Cerrar votación' })).toHaveCount(0);
});

Then('el diálogo dice {string}', async (texto: string) => {
  await expect(paginaActual().getByRole('dialog')).toContainText(texto);
});

Then('la votación {string} está cerrada con la ganadora {string}', async (titulo: string, ganadora: string) => {
  await expect(region(titulo)).toContainText('Cerrada');
  await expect(region(titulo)).toContainText(`Ganó: ${ganadora}`);
});

Then('ya no se puede votar en {string}', async (titulo: string) => {
  await expect(region(titulo).getByRole('radio')).toHaveCount(0);
  await expect(region(titulo).getByRole('button', { name: /voto/ })).toHaveCount(0);
});

Then('el servidor ha recibido {int} voto(s)', (cantidad: number) => {
  expect(votosRecibidos).toBe(cantidad);
});

Then('el servidor ha cerrado {int} votación/votaciones', (cantidad: number) => {
  expect(cierresRecibidos).toBe(cantidad);
});

Then('estoy en «Elegir destino» del viaje', async () => {
  await expect(paginaActual()).toHaveURL(/\/viajes\/[^/]+\/destino$/);
  await expect(paginaActual().getByRole('region', { name: 'Votación del destino' })).toBeVisible();
});

Then('en la votación del destino han votado {int} de {int} miembros', async (votantes: number, total: number) => {
  await expect(paginaActual().getByRole('region', { name: 'Votación del destino' })).toContainText(`${votantes}/${total}`);
});

Then('el viaje tiene como destino {string}', (destino: string) => {
  expect(elViaje().destino).toBe(destino);
});

Then('veo el viaje {string} en mis viajes sin destino pendiente', async (nombre: string) => {
  await irA('/');
  const tarjeta = paginaActual().getByRole('button', { name: new RegExp(nombre) });
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta).not.toContainText('Pendiente de destino');
});
