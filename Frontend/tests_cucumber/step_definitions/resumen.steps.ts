import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

type DatosDelResumen = { gasto: number; actividad: string; alma: string };

let datos: DatosDelResumen | null = null;

Before(() => {
  datos = null;
});

const json = (status: number, cuerpo: unknown) => ({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const simularResumen = async (viajeId: string, { gasto, actividad, alma }: DatosDelResumen) => {
  const idAlma = alma === 'Berta' ? 'otro' : 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
  await paginaActual().route(`**/api/viajes/${viajeId}/resumen`, (route) =>
    route.fulfill(
      json(200, {
        dias: 4,
        gasto_total: gasto,
        gasto_mayor: { concepto: 'Cena Trastevere', importe: 120.5 },
        actividad_mas_votada: { titulo: actividad, votos: 3 },
        alma_del_grupo: { usuario_id: idAlma, nombre: alma, pagos: 2, planes_propuestos: 4, fotos_subidas: 1 },
      }),
    ),
  );
  await paginaActual().route(`**/api/viajes/${viajeId}/fotos`, (route) => route.fulfill(json(200, { fotos: [] })));
  await paginaActual().route(`**/api/viajes/${viajeId}/gastos/balance`, (route) =>
    route.fulfill(
      json(200, {
        saldos: [
          { usuario_id: 'otro', nombre: 'Berta', pagado: gasto, parte: gasto / 2, saldo: gasto / 2 },
          { usuario_id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc', nombre: 'Adriana', pagado: 0, parte: gasto / 2, saldo: -gasto / 2 },
        ],
      }),
    ),
  );
};

Given(
  'que el resumen del viaje {string} tiene {int} euros de gasto, el Coliseo como actividad más votada y a Berta como alma del grupo',
  (_viaje: string, gasto: number) => {
    datos = { gasto, actividad: 'Coliseo', alma: 'Berta' };
  },
);

When('abro el resumen del viaje {string}', async (viaje: string) => {
  const id = idDelViaje(viaje);
  expect(id, `el viaje "${viaje}" no está preparado`).toBeDefined();
  expect(datos, 'faltan los datos del resumen').not.toBeNull();
  await simularResumen(id as string, datos as DatosDelResumen);
  await paginaActual().goto(new URL(`/viajes/${id}/resumen`, paginaActual().url()).toString());
  await expect(paginaActual().getByRole('heading', { name: 'Roma' })).toBeVisible();
});

When('paso a la diapositiva siguiente', async () => {
  await paginaActual().getByRole('button', { name: 'Siguiente' }).click();
});

When('paso a la última diapositiva', async () => {
  const siguiente = paginaActual().getByRole('button', { name: 'Siguiente' });
  for (let i = 0; i < 6; i++) await siguiente.click();
});

Then('veo la diapositiva {string}', async (titulo: string) => {
  await expect(paginaActual().getByRole('region')).toHaveAccessibleName(new RegExp(`: ${titulo}$`));
});

Then('estoy en mis viajes', async () => {
  await expect(paginaActual()).toHaveURL(/\/$/);
});
