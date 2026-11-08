// Pasos de la cartera de documentos de un viaje (PB-30).
// Simulan el backend de los documentos. Usan la página y el login de login.steps.ts y los viajes de
// gestion_viajes.steps.ts, y reutilizan sus pasos de textos, botones y mensajes de error
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

const YO = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA = 'otro';

type DocumentoGuardado = {
  id: string;
  viaje_id: string;
  nombre: string;
  tipo_mime: string;
  tamano_bytes: number;
  subido_por: string;
  creado_en: string;
};

// Documentos de cada viaje, del más reciente al más antiguo, y subidas que ha recibido el backend
let documentos: DocumentoGuardado[] = [];
let subidas: { nombre: string; cabecera: string | undefined }[] = [];
let rechazaPorContenido = false;

Before(() => {
  documentos = [];
  subidas = [];
  rechazaPorContenido = false;
});

const json = (status: number, cuerpo: unknown) => ({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

// Se registra después de la ruta de viajes, así que tiene prioridad para /viajes/:id/documentos
const simularDocumentos = async () => {
  await paginaActual().route('**/api/viajes/*/documentos', (route) => {
    const peticion = route.request();
    const viajeId = new URL(peticion.url()).pathname.split('/').at(-2) ?? '';

    if (peticion.method() === 'GET') {
      return route.fulfill(json(200, { documentos: documentos.filter((d) => d.viaje_id === viajeId) }));
    }
    if (rechazaPorContenido) {
      return route.fulfill(
        json(400, { error: { codigo: 'tipo_no_permitido', mensaje: 'Solo se pueden subir documentos PDF o imágenes JPEG o PNG' } }),
      );
    }
    const cuerpo = peticion.postData() ?? '';
    const nombre = /filename="([^"]+)"/.exec(cuerpo)?.[1] ?? 'documento';
    subidas.push({ nombre, cabecera: peticion.headers()['authorization'] });
    const nuevo: DocumentoGuardado = {
      id: `documento-${documentos.length + 1}`,
      viaje_id: viajeId,
      nombre,
      tipo_mime: 'application/pdf',
      tamano_bytes: cuerpo.length,
      subido_por: YO,
      creado_en: '2026-11-08T12:00:00Z',
    };
    documentos.unshift(nuevo);
    return route.fulfill(json(201, nuevo));
  });
};

const idDe = (viaje: string) => {
  const id = idDelViaje(viaje);
  expect(id, `el viaje "${viaje}" no está preparado`).toBeDefined();
  return id as string;
};

const filasDeLaCartera = () => paginaActual().getByRole('list', { name: 'Documentos del viaje' }).getByRole('listitem');
const selectorDeArchivo = () => paginaActual().getByLabel('Elegir el documento que se va a subir');

// ── Preparación ──────────────────────────────────────────────────────────────

Given('que en la cartera del viaje {string} está el documento {string}', (viaje: string, nombre: string) => {
  documentos.unshift({
    id: `documento-${documentos.length + 1}`,
    viaje_id: idDe(viaje),
    nombre,
    tipo_mime: 'application/pdf',
    tamano_bytes: 248731,
    subido_por: BERTA,
    creado_en: '2026-11-07T10:00:00Z',
  });
});

Given('que el servidor rechaza los documentos porque su contenido no es un PDF ni una imagen', () => {
  rechazaPorContenido = true;
});

// ── Acciones ─────────────────────────────────────────────────────────────────

When('abro la cartera de documentos del viaje {string}', async (viaje: string) => {
  const id = idDe(viaje);
  await simularDocumentos();
  await paginaActual().goto(new URL(`/viajes/${id}/documentos`, paginaActual().url()).toString());
  await expect(paginaActual().getByText('Documentos del viaje', { exact: true })).toBeVisible();
});

When('subo el archivo {string} de tipo {string}', async (nombre: string, tipo: string) => {
  await selectorDeArchivo().setInputFiles({ name: nombre, mimeType: tipo, buffer: Buffer.from('%PDF-1.4\n%archivo de prueba') });
});

When('subo un archivo {string} de tipo {string} de {int} bytes', async (nombre: string, tipo: string, bytes: number) => {
  await selectorDeArchivo().setInputFiles({ name: nombre, mimeType: tipo, buffer: Buffer.alloc(bytes, 1) });
});

// ── Comprobaciones ───────────────────────────────────────────────────────────

// Nombres separados por comas, en el orden en que deben aparecer
Then('veo en la cartera de documentos, por este orden, {string}', async (nombres: string) => {
  const esperados = nombres.split(', ');
  await expect(filasDeLaCartera()).toHaveCount(esperados.length);
  for (const [i, nombre] of esperados.entries()) {
    await expect(filasDeLaCartera().nth(i)).toContainText(nombre);
  }
});

Then('la cartera de documentos está vacía', async () => {
  await expect(paginaActual().getByText('Aún no hay documentos en la cartera del viaje.')).toBeVisible();
  await expect(filasDeLaCartera()).toHaveCount(0);
});

Then('el servidor ha recibido {int} documento(s)', (cantidad: number) => {
  expect(subidas).toHaveLength(cantidad);
});

Then('el servidor ha recibido 1 documento {string}', (nombre: string) => {
  expect(subidas.map((s) => s.nombre)).toEqual([nombre]);
  expect(subidas[0].cabecera).toMatch(/^Bearer .+/);
});
