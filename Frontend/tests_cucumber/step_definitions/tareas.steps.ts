// Pasos de la lista de tareas colaborativa del viaje (PB-41): crear, marcar, editar y borrar.
// Simulan en memoria el backend de las tareas. Usan la página y el login de login.steps.ts y los viajes de
// gestion_viajes.steps.ts, y reutilizan sus pasos de textos, botones y diálogos de confirmación
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

const YO = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA = 'otro';
const NOMBRES: Record<string, string> = { [YO]: 'Adriana', [BERTA]: 'Berta' };

type TareaGuardada = { id: string; viaje_id: string; texto: string; hecha: boolean; responsable_id: string };

let tareas: TareaGuardada[] = [];

Before(() => {
  tareas = [];
});

const json = (status: number, cuerpo: unknown) => ({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const idDeUsuario = (nombre: string) => Object.entries(NOMBRES).find(([, n]) => n === nombre)?.[0] ?? '';

// Formato de la API: el responsable sale con su nombre
const formatear = (t: TareaGuardada) => ({
  id: t.id,
  texto: t.texto,
  hecha: t.hecha,
  hecha_en: t.hecha ? '2027-05-02T09:00:00Z' : null,
  creado_en: '2027-05-01T10:00:00Z',
  responsable: { usuario_id: t.responsable_id, nombre: NOMBRES[t.responsable_id] ?? null, avatar_url: null },
});

const idDe = (viaje: string) => {
  const id = idDelViaje(viaje);
  expect(id, `el viaje "${viaje}" no está preparado`).toBeDefined();
  return id as string;
};

// Se registra después de la ruta de viajes, así que tiene prioridad para /viajes/:id/tareas y /viajes/:id/documentos
const simularTareas = async () => {
  const pagina = paginaActual();
  await pagina.route('**/api/viajes/*/documentos', (route) => route.fulfill(json(200, { documentos: [] })));
  await pagina.route('**/api/viajes/*/tareas**', (route) => {
    const peticion = route.request();
    const partes = new URL(peticion.url()).pathname.split('/');
    const viajeId = partes[3];
    const tarea = tareas.find((t) => t.id === partes[5] && t.viaje_id === viajeId);

    if (!partes[5]) {
      if (peticion.method() === 'GET') return route.fulfill(json(200, { tareas: tareas.filter((t) => t.viaje_id === viajeId).map(formatear) }));
      const { texto, responsable_id: responsableId } = peticion.postDataJSON();
      const nueva: TareaGuardada = { id: `tarea-${tareas.length + 1}`, viaje_id: viajeId, texto, hecha: false, responsable_id: responsableId };
      tareas.push(nueva);
      return route.fulfill(json(201, formatear(nueva)));
    }
    if (!tarea) return route.fulfill(json(404, { error: { codigo: 'tarea_no_encontrada', mensaje: 'La tarea no existe en este viaje' } }));
    if (peticion.method() === 'PATCH') {
      const cambios = peticion.postDataJSON();
      if (cambios.texto !== undefined) tarea.texto = cambios.texto;
      if (cambios.responsable_id !== undefined) tarea.responsable_id = cambios.responsable_id;
      if (cambios.hecha !== undefined) tarea.hecha = cambios.hecha;
      return route.fulfill(json(200, formatear(tarea)));
    }
    tareas = tareas.filter((t) => t !== tarea);
    return route.fulfill({ status: 204 });
  });
};

const fila = (texto: string) => paginaActual().getByRole('list', { name: 'Tareas del viaje' }).getByRole('listitem').filter({ hasText: texto });

// ── Preparación ──────────────────────────────────────────────────────────────

Given('que en el viaje {string} está la tarea {string} para {string}', (viaje: string, texto: string, responsable: string) => {
  tareas.push({ id: `tarea-${tareas.length + 1}`, viaje_id: idDe(viaje), texto, hecha: false, responsable_id: idDeUsuario(responsable) });
});

Given('que en el viaje {string} está la tarea hecha {string} para {string}', (viaje: string, texto: string, responsable: string) => {
  tareas.push({ id: `tarea-${tareas.length + 1}`, viaje_id: idDe(viaje), texto, hecha: true, responsable_id: idDeUsuario(responsable) });
});

// ── Acciones ─────────────────────────────────────────────────────────────────

When('abro la lista de tareas del viaje {string}', async (viaje: string) => {
  const id = idDe(viaje);
  await simularTareas();
  await paginaActual().goto(new URL(`/viajes/${id}/documentos?pestana=tareas`, paginaActual().url()).toString());
  await expect(paginaActual().getByText('Lista de Tareas', { exact: true })).toBeVisible();
});

When('añado la tarea {string} para {string}', async (texto: string, responsable: string) => {
  await paginaActual().getByRole('button', { name: 'Nueva' }).click();
  await paginaActual().getByLabel('Tarea', { exact: true }).fill(texto);
  await paginaActual().getByLabel('Responsable', { exact: true }).selectOption({ label: responsable });
  await paginaActual().getByRole('button', { name: 'Añadir' }).click();
});

When('marco la tarea {string}', async (texto: string) => {
  await paginaActual().getByRole('checkbox', { name: `Marcar ${texto} como hecha` }).click();
});

When('edito la tarea {string} con el texto {string} y el responsable {string}', async (texto: string, nuevo: string, responsable: string) => {
  await paginaActual().getByRole('button', { name: `Editar ${texto}` }).click();
  await paginaActual().getByLabel('Tarea', { exact: true }).fill(nuevo);
  await paginaActual().getByLabel('Responsable', { exact: true }).selectOption({ label: responsable });
  await paginaActual().getByRole('button', { name: 'Guardar' }).click();
});

When('pulso eliminar la tarea {string}', async (texto: string) => {
  await paginaActual().getByRole('button', { name: `Eliminar ${texto}` }).click();
});

// ── Comprobaciones ───────────────────────────────────────────────────────────

Then('veo la tarea {string}', async (texto: string) => {
  await expect(fila(texto)).toBeVisible();
});

Then('no veo la tarea {string}', async (texto: string) => {
  await expect(fila(texto)).toHaveCount(0);
});

Then('la tarea {string} está marcada', async (texto: string) => {
  await expect(paginaActual().getByRole('checkbox', { name: `Marcar ${texto} como hecha` })).toHaveAttribute('aria-checked', 'true');
});

Then('la tarea {string} está pendiente', async (texto: string) => {
  await expect(paginaActual().getByRole('checkbox', { name: `Marcar ${texto} como hecha` })).toHaveAttribute('aria-checked', 'false');
});

Then('la tarea {string} tiene a {string} como responsable', async (texto: string, responsable: string) => {
  await expect(fila(texto).getByRole('img', { name: `Responsable: ${responsable}` })).toBeVisible();
});

Then('el servidor tiene la tarea {string} para {string}', async (texto: string, responsable: string) => {
  await expect.poll(() => tareas.filter((t) => t.texto === texto).map((t) => NOMBRES[t.responsable_id])).toEqual([responsable]);
});

Then('el servidor tiene {int} tarea(s) hecha(s)', async (cantidad: number) => {
  await expect.poll(() => tareas.filter((t) => t.hecha).length).toBe(cantidad);
});

Then('el servidor tiene {int} tarea(s)', async (cantidad: number) => {
  await expect.poll(() => tareas.length).toBe(cantidad);
});

Then('no veo ningún botón de {string}', async (nombre: string) => {
  await expect(paginaActual().getByRole('button', { name: new RegExp(`^${nombre}`) })).toHaveCount(0);
});

Then('la casilla de la tarea {string} está desactivada', async (texto: string) => {
  await expect(paginaActual().getByRole('checkbox', { name: `Marcar ${texto} como hecha` })).toBeDisabled();
});
