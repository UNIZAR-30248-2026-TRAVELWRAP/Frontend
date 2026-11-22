import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { simularActividades } from './anadir_actividad.steps';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA = 'otro';

type Punto = {
  id: string;
  viaje_id: string;
  nombre: string;
  nota: string | null;
  categoria: string | null;
  latitud: number;
  longitud: number;
  lugar_externo_id: string | null;
  direccion: string | null;
  creado_por: string;
  creado_en: string;
};

let puntos: Punto[] = [];
let recibidos: Record<string, unknown>[] = [];
let borrados: string[] = [];
let rechazaAlGuardar = false;

Before(() => {
  puntos = [];
  recibidos = [];
  borrados = [];
  rechazaAlGuardar = false;
});

const idDe = (viaje: string) => {
  const id = idDelViaje(viaje);
  expect(id, `el viaje "${viaje}" no está preparado`).toBeDefined();
  return id as string;
};

const TIPOS: Record<string, string | null> = {
  comida: 'comida',
  cultura: 'cultura',
  transporte: 'transporte',
  alojamiento: 'alojamiento',
  otro: 'otro',
  'sin tipo': null,
};

const tipoDe = (texto: string) => {
  expect(Object.keys(TIPOS), `el tipo "${texto}" no existe`).toContain(texto);
  return TIPOS[texto];
};

const sembrar = (viaje: string, nombre: string, tipo: string, autor: string, direccion: string | null) => {
  const numero = puntos.length + 1;
  puntos.push({
    id: `punto-${numero}`,
    viaje_id: idDe(viaje),
    nombre,
    nota: null,
    categoria: tipoDe(tipo),
    latitud: 41.89 + numero * 0.003,
    longitud: 12.47 + numero * 0.004,
    lugar_externo_id: null,
    direccion,
    creado_por: autor === 'Berta' ? BERTA : USUARIO_ID,
    creado_en: '2026-11-22T10:00:00Z',
  });
};

Given('que en el viaje {string} hay el punto de interés {string} de tipo {string} añadido por {string}', (viaje: string, nombre: string, tipo: string, autor: string) => {
  sembrar(viaje, nombre, tipo, autor, null);
});

Given(
  'que en el viaje {string} hay el punto de interés {string} de tipo {string} añadido por {string} en la dirección {string}',
  (viaje: string, nombre: string, tipo: string, autor: string, direccion: string) => {
    sembrar(viaje, nombre, tipo, autor, direccion);
  },
);

Given('que el servidor rechaza guardar puntos de interés', () => {
  rechazaAlGuardar = true;
});

const simularPuntos = async () => {
  await paginaActual().route('**/api/viajes/*/puntos-de-interes**', (route) => {
    const peticion = route.request();
    const partes = new URL(peticion.url()).pathname.split('/');
    const metodo = peticion.method();
    if (metodo === 'DELETE') {
      const id = partes.at(-1) ?? '';
      borrados.push(id);
      puntos = puntos.filter((p) => p.id !== id);
      return route.fulfill({ status: 204 });
    }
    if (metodo === 'POST') {
      if (rechazaAlGuardar) {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: { codigo: 'datos_invalidos', mensaje: 'El nombre es obligatorio y tiene un máximo de 120 caracteres' } }),
        });
      }
      const cuerpo = peticion.postDataJSON();
      recibidos.push(cuerpo);
      const nuevo: Punto = {
        id: `punto-${puntos.length + 1}`,
        viaje_id: partes.at(-2) ?? '',
        nota: null,
        categoria: null,
        lugar_externo_id: null,
        direccion: null,
        creado_por: USUARIO_ID,
        creado_en: '2026-11-22T10:00:00Z',
        ...cuerpo,
      };
      puntos.push(nuevo);
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(nuevo) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ puntos_interes: puntos }) });
  });
};

const mapa = () => paginaActual().getByRole('region', { name: 'Mapa de los puntos de interés' });
const ficha = (nombre: string) => paginaActual().getByRole('dialog', { name: nombre, exact: true });

When('abro los puntos de interés del viaje {string}', async (viaje: string) => {
  const id = idDe(viaje);
  await simularActividades();
  await simularPuntos();
  await paginaActual().goto(new URL(`/viajes/${id}/itinerario`, paginaActual().url()).toString());
  await paginaActual().getByRole('tab', { name: 'Puntos de interés' }).click();
  await expect(paginaActual().getByRole('tabpanel', { name: 'Puntos de interés' })).toBeVisible();
});

When('toco el mapa de los puntos de interés', async () => {
  await mapa().click({ position: { x: 60, y: 150 } });
});

When('busco el sitio {string}', async (consulta: string) => {
  await paginaActual().getByLabel('Buscar una dirección').fill(consulta);
  await paginaActual().getByRole('button', { name: 'Buscar dirección' }).click();
});

When('escribo el nombre del punto {string}', async (nombre: string) => {
  await paginaActual().getByLabel('Nombre del punto').fill(nombre);
});

When('escribo la nota del punto {string}', async (nota: string) => {
  await paginaActual().getByLabel('Nota (opcional)').fill(nota);
});

When('elijo el tipo de punto {string}', async (tipo: string) => {
  await ficha('Nuevo punto de interés').getByRole('button', { name: tipo, exact: true }).click();
});

When('guardo el punto de interés', async () => {
  await paginaActual().getByRole('button', { name: 'Guardar punto' }).click();
});

When('abro el punto de interés {string}', async (nombre: string) => {
  await paginaActual().getByRole('button', { name: `Ver ${nombre} en el mapa` }).click();
});

When('cierro la ficha', async () => {
  await paginaActual().getByRole('button', { name: 'Cerrar ficha' }).click();
});

When('borro el punto desde su ficha', async () => {
  await paginaActual().getByRole('dialog').getByRole('button', { name: 'Borrar', exact: true }).click();
});

When('confirmo el borrado del punto', async () => {
  await paginaActual()
    .getByRole('dialog', { name: '¿Eliminar este punto de interés?' })
    .getByRole('button', { name: 'Eliminar punto' })
    .click();
});

When('filtro los puntos por el tipo {string}', async (tipo: string) => {
  await paginaActual().getByRole('group', { name: 'Filtrar por tipo' }).getByRole('button', { name: tipo, exact: true }).click();
});

When('filtro los puntos por los añadidos por {string}', async (autor: string) => {
  await paginaActual().getByRole('group', { name: 'Filtrar por quién lo añadió' }).getByRole('button', { name: autor }).click();
});

Then('veo {int} puntos de interés en la lista', async (cantidad: number) => {
  await expect(paginaActual().getByRole('list', { name: 'Puntos de interés' }).getByRole('listitem')).toHaveCount(cantidad);
});

Then('veo {int} puntos de interés en el mapa', async (cantidad: number) => {
  await expect(paginaActual().locator('.leaflet-marker-icon')).toHaveCount(cantidad);
});

Then('veo la ficha del punto {string}', async (nombre: string) => {
  await expect(ficha(nombre)).toBeVisible();
});

Then('la ficha del punto {string} muestra {string}', async (nombre: string, texto: string) => {
  await expect(ficha(nombre)).toContainText(texto);
});

Then('la ficha del punto {string} enlaza a Google Maps con las coordenadas {string}', async (nombre: string, coordenadas: string) => {
  const enlace = ficha(nombre).getByRole('link', { name: 'Abrir en Google Maps' });
  await expect(enlace).toHaveAttribute('target', '_blank');
  const datos = new URL((await enlace.getAttribute('href')) ?? '').searchParams;
  expect(datos.get('query')).toBe(coordenadas);
});

Then('no veo ninguna ficha', async () => {
  await expect(paginaActual().getByRole('dialog')).toHaveCount(0);
});

Then('veo el panel del nuevo punto con {string}', async (texto: string) => {
  await expect(ficha('Nuevo punto de interés')).toContainText(texto);
});

Then('veo el aviso {string} en el panel del nuevo punto', async (texto: string) => {
  await expect(ficha('Nuevo punto de interés').getByRole('alert')).toContainText(texto);
});

Then('el servidor ha recibido el punto {string} con la dirección {string}', (nombre: string, direccion: string) => {
  expect(recibidos).toHaveLength(1);
  expect(recibidos[0]).toMatchObject({ nombre, direccion });
});

Then('el servidor ha recibido el punto {string} sin dirección y de tipo {string}', (nombre: string, tipo: string) => {
  expect(recibidos).toHaveLength(1);
  expect(recibidos[0]).toMatchObject({ nombre, direccion: null, lugar_externo_id: null, categoria: tipoDe(tipo) });
});

Then('el servidor no ha recibido ningún punto', () => {
  expect(recibidos).toHaveLength(0);
});

Then('el servidor ha borrado {int} punto(s) de interés', (cantidad: number) => {
  expect(borrados).toHaveLength(cantidad);
});

Then('no puedo buscar direcciones para los puntos', async () => {
  await expect(paginaActual().getByLabel('Buscar una dirección')).toHaveCount(0);
});

Then('no veo ningún botón para eliminar puntos', async () => {
  await expect(paginaActual().getByRole('button', { name: /^Eliminar / })).toHaveCount(0);
});
