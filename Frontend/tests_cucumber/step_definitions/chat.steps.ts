// Pasos del chat del grupo (PB-40). Usan la página de login.steps.ts y el viaje simulado de gestion_viajes.steps.ts
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { paginaActual } from './login.steps';
import { idDelViaje } from './gestion_viajes.steps';

const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';

type MensajeChat = {
  id: string;
  texto: string;
  creado_en: string;
  autor: { usuario_id: string; nombre: string | null; avatar_url: string | null };
};

// Mensajes del chat del escenario y los textos que la pantalla ha enviado
let mensajes: MensajeChat[] = [];
let enviados: string[] = [];
let rutaRegistrada = false;

Before(() => {
  mensajes = [];
  enviados = [];
  rutaRegistrada = false;
});

const responder = (cuerpo: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(cuerpo),
});

// Historial y envío de mensajes del viaje, registrados una sola vez por escenario
const simularChat = async () => {
  if (rutaRegistrada) return;
  rutaRegistrada = true;
  await paginaActual().route('**/api/viajes/*/mensajes', (route) => {
    const peticion = route.request();
    if (peticion.method() === 'POST') {
      const { texto } = peticion.postDataJSON() as { texto: string };
      enviados.push(texto);
      const nuevo: MensajeChat = {
        id: `nuevo-${enviados.length}`,
        texto,
        creado_en: '2026-05-12T10:05:00Z',
        autor: { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null },
      };
      return route.fulfill(responder(nuevo, 201));
    }
    return route.fulfill(responder({ mensajes }));
  });
};

Given('que en el chat del viaje {string} hay un mensaje de {string} con el texto {string}', (_nombre: string, autor: string, texto: string) => {
  mensajes.push({
    id: `m${mensajes.length + 1}`,
    texto,
    creado_en: `2026-05-12T10:0${mensajes.length}:00Z`,
    autor: { usuario_id: 'otro', nombre: autor, avatar_url: null },
  });
});

When('abro el chat del viaje {string}', async (nombre: string) => {
  await simularChat();
  await paginaActual().goto(new URL(`/viajes/${idDelViaje(nombre)}/chat`, paginaActual().url()).toString());
  // La lista puede estar vacía (sin altura): basta con que esté en la página
  await expect(paginaActual().getByRole('list', { name: 'Mensajes' })).toBeAttached();
});

When('escribo {string} en el chat', async (texto: string) => {
  await paginaActual().getByLabel('Mensaje', { exact: true }).fill(texto);
});

Then('el servidor ha guardado el mensaje {string}', (texto: string) => {
  expect(enviados).toContain(texto);
});
