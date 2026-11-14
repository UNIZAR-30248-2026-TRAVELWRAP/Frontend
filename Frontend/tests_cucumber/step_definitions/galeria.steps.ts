import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

const YO = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA = 'otro';

type FotoGuardada = {
  id: string;
  viaje_id: string;
  nombre: string;
  tipo_mime: string;
  tamano_bytes: number;
  subido_por: string;
  creado_en: string;
  url: string;
};

const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

let fotos: FotoGuardada[] = [];
let subidas: { nombre: string; cabecera: string | undefined }[] = [];
let rechazaPorContenido = false;

Before(() => {
  fotos = [];
  subidas = [];
  rechazaPorContenido = false;
});

const json = (status: number, cuerpo: unknown) => ({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const simularFotos = async () => {
  await paginaActual().route('https://storage.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 }),
  );
  await paginaActual().route('**/api/viajes/*/fotos', (route) => {
    const peticion = route.request();
    const viajeId = new URL(peticion.url()).pathname.split('/').at(-2) ?? '';

    if (peticion.method() === 'GET') {
      return route.fulfill(json(200, { fotos: fotos.filter((f) => f.viaje_id === viajeId) }));
    }
    if (rechazaPorContenido) {
      return route.fulfill(
        json(400, { error: { codigo: 'tipo_no_permitido', mensaje: 'Solo se pueden subir fotos JPEG, PNG o WebP' } }),
      );
    }
    const cuerpo = peticion.postData() ?? '';
    const nombre = /filename="([^"]+)"/.exec(cuerpo)?.[1] ?? 'foto.jpg';
    subidas.push({ nombre, cabecera: peticion.headers()['authorization'] });
    const nueva: FotoGuardada = {
      id: `foto-${fotos.length + 1}`,
      viaje_id: viajeId,
      nombre,
      tipo_mime: 'image/jpeg',
      tamano_bytes: cuerpo.length,
      subido_por: YO,
      creado_en: '2027-05-13T12:00:00Z',
      url: `https://storage.test/${nombre}`,
    };
    fotos.unshift(nueva);
    return route.fulfill(json(201, nueva));
  });
};

const idDe = (viaje: string) => {
  const id = idDelViaje(viaje);
  expect(id, `el viaje "${viaje}" no está preparado`).toBeDefined();
  return id as string;
};

const filasDeLaGaleria = () => paginaActual().getByRole('list', { name: 'Fotos del viaje' }).getByRole('listitem');
const selectorDeFoto = () => paginaActual().getByLabel('Elegir la foto que se va a subir');

Given('que en la galería del viaje {string} está la foto {string}', (viaje: string, nombre: string) => {
  fotos.unshift({
    id: `foto-${fotos.length + 1}`,
    viaje_id: idDe(viaje),
    nombre,
    tipo_mime: 'image/jpeg',
    tamano_bytes: 248731,
    subido_por: BERTA,
    creado_en: '2027-05-12T10:00:00Z',
    url: `https://storage.test/${nombre}`,
  });
});

Given('que el servidor rechaza las fotos porque su contenido no es una imagen', () => {
  rechazaPorContenido = true;
});

When('abro la galería del viaje {string}', async (viaje: string) => {
  const id = idDe(viaje);
  await simularFotos();
  await paginaActual().goto(new URL(`/viajes/${id}/galeria`, paginaActual().url()).toString());
  await expect(paginaActual().getByText('Fotos compartidas', { exact: true })).toBeVisible();
});

When('subo la foto {string} de tipo {string}', async (nombre: string, tipo: string) => {
  await selectorDeFoto().setInputFiles({ name: nombre, mimeType: tipo, buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]) });
});

When('subo a la vez las fotos {string}', async (nombres: string) => {
  await selectorDeFoto().setInputFiles(
    nombres.split(', ').map((nombre) => ({ name: nombre, mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]) })),
  );
});

When('subo una foto {string} de tipo {string} de {int} bytes', async (nombre: string, tipo: string, bytes: number) => {
  await selectorDeFoto().setInputFiles({ name: nombre, mimeType: tipo, buffer: Buffer.alloc(bytes, 1) });
});

When('amplío la foto {string}', async (nombre: string) => {
  await paginaActual().getByRole('button', { name: `Ampliar ${nombre}` }).click();
});

When('paso a la foto siguiente', async () => {
  await paginaActual().getByRole('button', { name: 'Foto siguiente' }).click();
});

When('cierro la foto ampliada', async () => {
  await paginaActual().getByRole('button', { name: 'Cerrar foto' }).click();
});

Then('veo en la galería, por este orden, {string}', async (nombres: string) => {
  const esperados = nombres.split(', ');
  await expect(filasDeLaGaleria()).toHaveCount(esperados.length);
  for (const [i, nombre] of esperados.entries()) {
    await expect(filasDeLaGaleria().nth(i).getByRole('button')).toHaveAccessibleName(`Ampliar ${nombre}`);
  }
});

Then('la galería está vacía', async () => {
  await expect(paginaActual().getByText('Aún no hay fotos en la galería del viaje.')).toBeVisible();
  await expect(filasDeLaGaleria()).toHaveCount(0);
});

Then('veo la foto ampliada {string}', async (descripcion: string) => {
  await expect(paginaActual().getByRole('dialog')).toHaveAccessibleName(descripcion);
});

Then('ya no veo la foto ampliada', async () => {
  await expect(paginaActual().getByRole('dialog')).toHaveCount(0);
});

Then('el servidor ha recibido {int} foto(s)', (cantidad: number) => {
  expect(subidas).toHaveLength(cantidad);
});

Then('el servidor ha recibido 1 foto {string}', (nombre: string) => {
  expect(subidas.map((s) => s.nombre)).toEqual([nombre]);
  expect(subidas[0].cabecera).toMatch(/^Bearer .+/);
});
