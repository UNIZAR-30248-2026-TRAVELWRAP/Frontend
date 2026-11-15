// Pasos de los sellos de viaje (PB-44): elegirlos al terminar el viaje y verlos en el pasaporte del perfil.
// Simulan en memoria el sello de cada viaje y los endpoints de /perfil/sellos. Se registran después de los
// viajes de gestion_viajes.steps.ts, así que sus rutas tienen preferencia sobre las del viaje.
// Reutilizan los pasos de login.steps.ts (perfil, botones, diálogos) y de gestion_viajes.steps.ts (viajes)
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

type Sello = { id: string; viaje_id: string | null; diseno: string; destino: string; anio: number; elegido_en: string };

let sellos: Sello[] = [];
let fallaListar = false;

Before(() => {
  sellos = [];
  fallaListar = false;
});

const responder = (cuerpo: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(cuerpo),
});

const nuevoSello = (diseno: string, destino: string, anio: number, viajeId: string | null): Sello => ({
  id: `sello-${sellos.length + 1}`,
  viaje_id: viajeId,
  diseno,
  destino,
  anio,
  elegido_en: '2027-05-20T10:00:00Z',
});

const selector = () => paginaActual().getByRole('dialog').last();

Given('que el servidor guarda mis sellos', async () => {
  const pagina = paginaActual();

  // Sello del usuario en un viaje: el destino y el año son los de los viajes de prueba
  await pagina.route('**/api/viajes/*/sello', (route) => {
    const peticion = route.request();
    const viajeId = new URL(peticion.url()).pathname.split('/')[3];
    const propio = sellos.find((s) => s.viaje_id === viajeId);

    if (peticion.method() === 'PUT') {
      const { diseno } = peticion.postDataJSON();
      if (propio) propio.diseno = diseno;
      else sellos.push(nuevoSello(diseno, 'Roma', 2027, viajeId));
      return route.fulfill(responder({ sello: sellos.find((s) => s.viaje_id === viajeId) }));
    }
    if (peticion.method() === 'DELETE') {
      sellos = sellos.filter((s) => s.viaje_id !== viajeId);
      return route.fulfill({ status: 204 });
    }
    return route.fulfill(responder({ sello: propio ?? null }));
  });

  await pagina.route('**/api/perfil/sellos**', (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');

    if (ruta === '/perfil/sellos') {
      if (fallaListar) {
        return route.fulfill(responder({ error: { codigo: 'error_sello', mensaje: 'No se han podido obtener los sellos' } }, 502));
      }
      return route.fulfill(responder({ sellos }));
    }
    const sello = sellos.find((s) => s.id === ruta.split('/')[3]);
    if (!sello) return route.fulfill(responder({ error: { codigo: 'sello_no_encontrado', mensaje: 'El sello no existe' } }, 404));
    if (peticion.method() === 'PATCH') {
      sello.diseno = peticion.postDataJSON().diseno;
      return route.fulfill(responder({ sello }));
    }
    sellos = sellos.filter((s) => s !== sello);
    return route.fulfill({ status: 204 });
  });
});

Given('que ya he elegido el sello {string} en el viaje {string}', (diseno: string, nombre: string) => {
  sellos.push(nuevoSello(diseno, 'Roma', 2027, idDelViaje(nombre) ?? null));
});

Given('que tengo el sello {string} de {string} {int}', (diseno: string, destino: string, anio: number) => {
  sellos.push(nuevoSello(diseno, destino, anio, null));
});

Given('que el servidor no puede devolver mis sellos', () => {
  fallaListar = true;
});

When('elijo el diseño de sello {string}', async (nombre: string) => {
  await selector().getByRole('button', { name: new RegExp(`: ${nombre}$`) }).click();
});

When('toco el sello de {string}', async (texto: string) => {
  await paginaActual().getByRole('button', { name: `Cambiar el sello de ${texto}` }).click();
});

When('cierro el pasaporte de viajes', async () => {
  await paginaActual().getByRole('dialog', { name: /Pasaporte de viajes/ }).getByRole('button', { name: 'Cerrar' }).click();
});

Then('veo el sello de {string}', async (texto: string) => {
  await expect(paginaActual().getByRole('img', { name: `Sello de ${texto}` }).first()).toBeVisible();
});

Then('el diseño de sello {string} aparece marcado', async (nombre: string) => {
  await expect(selector().getByRole('button', { name: new RegExp(`: ${nombre}$`) })).toHaveAttribute('aria-pressed', 'true');
});

Then('el servidor guarda el sello {string} de {string}', async (diseno: string, destino: string) => {
  await expect.poll(() => sellos.filter((s) => s.destino === destino).map((s) => s.diseno)).toEqual([diseno]);
});

Then('el servidor no guarda ningún sello', async () => {
  await expect.poll(() => sellos.length).toBe(0);
});
