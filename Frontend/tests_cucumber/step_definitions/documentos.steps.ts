// Pasos de la cartera de documentos de un viaje: subir (PB-30), abrir o previsualizar (PB-31) y eliminar (PB-46).
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
// Documentos que el backend da por borrados (GET .../url responde 404) y enlaces que ha entregado
let borrados: string[] = [];
let enlacesEntregados: string[] = [];
// Nombres de los documentos para los que ha llegado un DELETE (PB-46) y si el backend falla al eliminar
let eliminaciones: string[] = [];
let falloAlEliminar = false;

const ARCHIVOS = 'https://storage.test/firmado';

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// PDF de una página con texto; pdf.js reconstruye solo la tabla de referencias cruzadas
const PDF_UNA_PAGINA = Buffer.from(
  [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    '4 0 obj << /Length 47 >>',
    'stream',
    'BT /F1 12 Tf 20 50 Td (Billete de prueba) Tj ET',
    'endstream endobj',
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    'trailer << /Root 1 0 R /Size 6 >>',
    '%%EOF',
  ].join('\n'),
);

Before(() => {
  documentos = [];
  subidas = [];
  rechazaPorContenido = false;
  borrados = [];
  enlacesEntregados = [];
  eliminaciones = [];
  falloAlEliminar = false;
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

// DELETE .../documentos/:id. Si el backend no falla, el documento deja de estar en el listado.
// Los enlaces .../:id/url no coinciden con este patrón, porque * no cruza barras
const simularEliminacion = async () => {
  await paginaActual().route('**/api/viajes/*/documentos/*', (route) => {
    const peticion = route.request();
    if (peticion.method() !== 'DELETE') return route.fallback();
    if (falloAlEliminar) {
      return route.fulfill(json(502, { error: { codigo: 'error_documento', mensaje: 'Fallo de Supabase' } }));
    }
    const id = new URL(peticion.url()).pathname.split('/').at(-1);
    const documento = documentos.find((d) => d.id === id);
    if (!documento) {
      return route.fulfill(json(404, { error: { codigo: 'documento_no_encontrado', mensaje: 'El documento no existe en este viaje' } }));
    }
    eliminaciones.push(documento.nombre);
    documentos = documentos.filter((d) => d.id !== id);
    return route.fulfill({ status: 204 });
  });
};

// Enlaces firmados (GET .../documentos/:id/url) y Supabase Storage con CORS abierto, que sirve el PDF o la imagen
const simularApertura = async () => {
  await paginaActual().route('**/api/viajes/*/documentos/*/url', (route) => {
    const id = new URL(route.request().url()).pathname.split('/').at(-2) ?? '';
    const documento = documentos.find((d) => d.id === id);
    if (!documento || borrados.includes(documento.nombre)) {
      return route.fulfill(json(404, { error: { codigo: 'documento_no_encontrado', mensaje: 'No existe' } }));
    }
    enlacesEntregados.push(documento.nombre);
    return route.fulfill(
      json(200, { url: `${ARCHIVOS}/${id}`, expira_en: '2026-11-08T10:05:00Z', nombre: documento.nombre, tipo_mime: documento.tipo_mime }),
    );
  });
  await paginaActual().route(`${ARCHIVOS}/**`, (route) => {
    const id = route.request().url().split('/').at(-1);
    const esPdf = documentos.find((d) => d.id === id)?.tipo_mime === 'application/pdf';
    return route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
      contentType: esPdf ? 'application/pdf' : 'image/png',
      body: esPdf ? PDF_UNA_PAGINA : PNG_1X1,
    });
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

Given('que en la cartera del viaje {string} está la imagen {string}', (viaje: string, nombre: string) => {
  documentos.unshift({
    id: `documento-${documentos.length + 1}`,
    viaje_id: idDe(viaje),
    nombre,
    tipo_mime: 'image/png',
    tamano_bytes: 1572864,
    subido_por: BERTA,
    creado_en: '2026-11-07T10:00:00Z',
  });
});

Given('que el documento {string} ya se ha eliminado del servidor', (nombre: string) => {
  borrados.push(nombre);
});

Given('que el servidor falla al eliminar documentos', () => {
  falloAlEliminar = true;
});

Given('que el servidor rechaza los documentos porque su contenido no es un PDF ni una imagen', () => {
  rechazaPorContenido = true;
});

// ── Acciones ─────────────────────────────────────────────────────────────────

When('abro la cartera de documentos del viaje {string}', async (viaje: string) => {
  const id = idDe(viaje);
  await simularDocumentos();
  await simularApertura();
  await simularEliminacion();
  await paginaActual().goto(new URL(`/viajes/${id}/documentos`, paginaActual().url()).toString());
  await expect(paginaActual().getByText('Documentos del viaje', { exact: true })).toBeVisible();
});

When('subo el archivo {string} de tipo {string}', async (nombre: string, tipo: string) => {
  await selectorDeArchivo().setInputFiles({ name: nombre, mimeType: tipo, buffer: Buffer.from('%PDF-1.4\n%archivo de prueba') });
});

When('subo un archivo {string} de tipo {string} de {int} bytes', async (nombre: string, tipo: string, bytes: number) => {
  await selectorDeArchivo().setInputFiles({ name: nombre, mimeType: tipo, buffer: Buffer.alloc(bytes, 1) });
});

When('abro el documento {string}', async (nombre: string) => {
  await paginaActual().getByRole('button', { name: `Abrir ${nombre}` }).click();
});

When('pulso eliminar el documento {string}', async (nombre: string) => {
  await paginaActual().getByRole('button', { name: `Eliminar ${nombre}` }).click();
});

When('cancelo la eliminación del documento', async () => {
  await paginaActual().getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();
});

When('cierro la vista previa del documento', async () => {
  await paginaActual().getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
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

Then('la página {int} del documento está dibujada', async (numero: number) => {
  const lienzo = paginaActual().getByRole('dialog').getByLabel(`Página ${numero} del documento`);
  await expect(lienzo).toBeVisible();
  // Un lienzo en blanco no tiene píxeles oscuros: con el texto del PDF dibujado, sí
  await expect
    .poll(() =>
      lienzo.evaluate((elemento: HTMLCanvasElement) => {
        const datos = elemento.getContext('2d')?.getImageData(0, 0, elemento.width, elemento.height).data ?? [];
        return datos.some((valor, indice) => indice % 4 !== 3 && valor < 200);
      }),
    )
    .toBe(true);
});

Then('veo la imagen {string} ampliada', async (nombre: string) => {
  const imagen = paginaActual().getByRole('dialog').getByRole('img', { name: nombre });
  await expect(imagen).toBeVisible();
  await expect.poll(() => imagen.evaluate((elemento: HTMLImageElement) => elemento.naturalWidth)).toBe(1);
});

Then('no veo la vista previa del documento', async () => {
  await expect(paginaActual().getByRole('dialog')).toHaveCount(0);
});

Then('el servidor ha entregado un enlace para abrir el documento {string}', (nombre: string) => {
  // En desarrollo React monta los efectos dos veces, así que la misma petición puede repetirse
  expect(new Set(enlacesEntregados)).toEqual(new Set([nombre]));
});

Then('el servidor ha recibido 1 petición de eliminar el documento {string}', (nombre: string) => {
  expect(eliminaciones).toEqual([nombre]);
});

Then('el servidor ha recibido {int} peticiones de eliminar documentos', (cantidad: number) => {
  expect(eliminaciones).toHaveLength(cantidad);
});
