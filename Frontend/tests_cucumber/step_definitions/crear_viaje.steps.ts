// Pasos de RF8 (crear viaje). Usan la página y el servidor que prepara login.steps.ts
import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { paginaActual } from './login.steps';

const usuarioId = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';

Given('que el servidor guarda los viajes que creo', async () => {
  const viajes: Record<string, unknown>[] = [];
  await paginaActual().route('**/api/viajes', (route) => {
    if (route.request().method() !== 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ viajes }) });
    }
    const datos = route.request().postDataJSON();
    const nuevo = {
      id: `viaje-${viajes.length + 1}`,
      descripcion: null,
      moneda: 'EUR',
      estado: 'activo',
      creado_en: new Date().toISOString(),
      pendiente_destino: datos.destino === null,
      rol: 'creador',
      miembros: [{ usuario_id: usuarioId, nombre: 'Daniel', avatar_url: null, rol: 'creador' }],
      ...datos,
    };
    viajes.unshift(nuevo);
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(nuevo) });
  });
});

Given('que el servidor no puede crear viajes', async () => {
  await paginaActual().route('**/api/viajes', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({ error: { codigo: 'error_viaje', mensaje: 'No se ha podido crear el viaje' } }),
        })
      : route.fallback(),
  );
});

When('creo el viaje {string} con destino {string} y presupuesto {string}', async (nombre: string, destino: string, presupuesto: string) => {
  const pagina = paginaActual();
  await pagina.getByRole('button', { name: 'Crear nuevo viaje' }).click();
  await pagina.getByLabel('Nombre del viaje').fill(nombre);
  await pagina.getByLabel('Presupuesto estimado (€)').fill(presupuesto);
  await pagina.getByPlaceholder('Ciudad o país').fill(destino);
  await pagina.getByRole('button', { name: 'Crear viaje', exact: true }).click();
});

Then('vuelvo a la pantalla de mis viajes', async () => {
  await expect(paginaActual()).toHaveURL(/\/$/);
  await expect(paginaActual().getByText('Mis Viajes')).toBeVisible();
});

Then('veo el viaje {string} en curso con presupuesto {string}', async (nombre: string, presupuesto: string) => {
  const tarjeta = paginaActual().getByRole('button', { name: new RegExp(nombre) });
  await expect(tarjeta).toContainText('En curso');
  await expect(tarjeta).toContainText(presupuesto);
});

Then('sigo en el formulario de nuevo viaje', async () => {
  await expect(paginaActual()).toHaveURL(/\/viajes\/nuevo$/);
});
