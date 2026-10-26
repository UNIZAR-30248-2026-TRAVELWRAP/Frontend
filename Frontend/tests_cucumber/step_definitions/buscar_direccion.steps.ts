import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { actividadesGuardadas } from './anadir_actividad.steps';
import { paginaActual } from './login.steps';

type RespuestaBusqueda = { status: number; cuerpo: unknown };

let respuestaBusqueda: RespuestaBusqueda = { status: 200, cuerpo: { direcciones: [] } };
let consultas: string[] = [];

Before(() => {
  respuestaBusqueda = { status: 200, cuerpo: { direcciones: [] } };
  consultas = [];
});

const simularDirecciones = async () => {
  await paginaActual().route('**/api/direcciones**', (route) => {
    consultas.push(new URL(route.request().url()).searchParams.get('q') ?? '');
    return route.fulfill({
      status: respuestaBusqueda.status,
      contentType: 'application/json',
      body: JSON.stringify(respuestaBusqueda.cuerpo),
    });
  });
};

const guardadas = () =>
  actividadesGuardadas().map((a) => ({
    titulo: a.titulo,
    ubicacion_nombre: a.ubicacion_nombre,
    latitud: a.latitud,
    longitud: a.longitud,
    lugar_externo_id: a.lugar_externo_id,
  }));

Given(
  'que el buscador de direcciones encuentra {string} en {string} en la latitud {float} y la longitud {float}',
  async (titulo: string, localidad: string, latitud: number, longitud: number) => {
    respuestaBusqueda = {
      status: 200,
      cuerpo: {
        direcciones: [
          {
            nombre: `${titulo}, ${localidad}`,
            titulo,
            detalle: `${localidad}, Italia`,
            latitud,
            longitud,
            lugar_externo_id: 'way/24146600',
          },
        ],
      },
    };
    await simularDirecciones();
  },
);

Given('que el buscador de direcciones no encuentra nada', async () => {
  respuestaBusqueda = { status: 200, cuerpo: { direcciones: [] } };
  await simularDirecciones();
});

Given('que el buscador de direcciones responde {string} con el código {int}', async (mensaje: string, status: number) => {
  respuestaBusqueda = { status, cuerpo: { error: { codigo: 'error_buscador', mensaje } } };
  await simularDirecciones();
});

When('escribo el lugar {string}', async (lugar: string) => {
  await paginaActual().getByLabel('Lugar / Dirección').fill(lugar);
});

When('busco la dirección {string}', async (lugar: string) => {
  await paginaActual().getByLabel('Lugar / Dirección').fill(lugar);
  await paginaActual().getByRole('button', { name: 'Buscar dirección' }).click();
});

When('elijo el resultado {string}', async (titulo: string) => {
  await paginaActual().getByRole('button', { name: titulo }).click();
});

Then('el resultado {int} muestra el título {string} y el detalle {string}', async (posicion: number, titulo: string, detalle: string) => {
  const resultado = paginaActual()
    .getByRole('list', { name: 'Resultados de la búsqueda' })
    .getByRole('listitem')
    .nth(posicion - 1);
  await expect(resultado).toContainText(titulo);
  await expect(resultado).toContainText(detalle);
});

When('relleno solo el título {string}', async (titulo: string) => {
  await paginaActual().getByLabel('Nombre de la actividad').fill(titulo);
});

Then('el botón de buscar dirección está desactivado', async () => {
  await expect(paginaActual().getByRole('button', { name: 'Buscar dirección' })).toBeDisabled();
});

Then('el servidor de direcciones ha recibido la búsqueda {string}', (consulta: string) => {
  expect(consultas).toEqual([consulta]);
});

Then('veo {int} resultados de búsqueda', async (cantidad: number) => {
  await expect(
    paginaActual().getByRole('list', { name: 'Resultados de la búsqueda' }).getByRole('listitem'),
  ).toHaveCount(cantidad);
});

Then('veo el aviso de que no hay resultados', async () => {
  await expect(paginaActual().getByText(/No se han encontrado resultados/)).toBeVisible();
});

Then('veo la ubicación localizada en el mapa', async () => {
  await expect(paginaActual().getByText('Ubicación localizada en el mapa')).toBeVisible();
});

Then('no veo la ubicación localizada en el mapa', async () => {
  await expect(paginaActual().getByText('Ubicación localizada en el mapa')).toHaveCount(0);
});

Then('el campo del lugar contiene {string}', async (texto: string) => {
  await expect(paginaActual().getByLabel('Lugar / Dirección')).toHaveValue(texto);
});

Then(
  'el servidor ha guardado la actividad {string} en {string} con la latitud {float} y la longitud {float}',
  (titulo: string, lugar: string, latitud: number, longitud: number) => {
    expect(guardadas()).toEqual([
      { titulo, ubicacion_nombre: lugar, latitud, longitud, lugar_externo_id: 'way/24146600' },
    ]);
  },
);

Then('el servidor ha guardado la actividad {string} en {string} sin coordenadas', (titulo: string, lugar: string) => {
  expect(guardadas()).toEqual([
    { titulo, ubicacion_nombre: lugar, latitud: null, longitud: null, lugar_externo_id: null },
  ]);
});
