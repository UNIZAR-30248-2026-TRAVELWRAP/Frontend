// Pasos de los gastos compartidos de un viaje.

// Usan la página que prepara login.steps.ts y los viajes de gestion_viajes.steps.ts, y reutilizan sus pasos
// de botones y mensajes de error
import { Before, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { idDelViaje } from './gestion_viajes.steps';
import { paginaActual } from './login.steps';

// Los importes enteros se muestran sin céntimos («30 €»), así que el texto esperado del feature se normaliza igual
const sinCentimosEnteros = (texto: string) => texto.replace(/,00(?= €)/g, "");

// Mismos miembros que «que soy miembro, pero no creador, del viaje activo»
const ID_DE = { Berta: 'otro', Adriana: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc' } as Record<string, string>;

type GastoRecibido = {
  concepto: string;
  importe: number;
  categoria: string;
  pagado_por: string;
  participantes: string[];
};

type GastoGuardado = GastoRecibido & { fecha: string };

// Gastos que ha recibido el backend simulado en cada escenario
let gastos: GastoRecibido[] = [];
// Gastos que ya tenía el viaje al empezar el escenario
let previos: GastoGuardado[] = [];
let rechazaPorViajeCerrado = false;
// Gastos que el escenario ha editado o borrado, tal como los ha recibido el backend simulado
let editados: GastoRecibido[] = [];
let borrados: string[] = [];
// Deudas que quien usa la app (Adriana) ha marcado como saldadas: de quién, importe
let marcadas: { de: string; importe: number }[] = [];

Before(() => {
  gastos = [];
  previos = [];
  rechazaPorViajeCerrado = false;
  editados = [];
  borrados = [];
  marcadas = [];
});

// Fecha de los gastos registrados en el escenario: posterior a la de los previos, así que salen primero
const FECHA_NUEVOS = '2027-05-15';

// Historial como lo devuelve el backend: del más reciente al más antiguo, con el total sumado en céntimos
const historial = () => {
  const nuevos = gastos.map((gasto) => ({ ...gasto, fecha: FECHA_NUEVOS })).reverse();
  const anteriores = [...previos].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const lista = [...nuevos, ...anteriores].map((gasto, i) => ({ id: `gasto-${i + 1}`, ...gasto, repartos: [] }));
  const total = lista.reduce((suma, gasto) => suma + Math.round(gasto.importe * 100), 0) / 100;
  return { gastos: lista, total };
};

// Nombre de cada miembro a partir de su id, para el reparto del detalle
const NOMBRE_DE = Object.fromEntries(Object.entries(ID_DE).map(([nombre, id]) => [id, nombre]));

// Detalle de un gasto como lo devuelve GET /gastos/:id: la parte de cada participante a partes iguales en céntimos
// (los que sobran, para los primeros). Quien lo registra es Adriana, así que puede modificarlo y eliminarlo
const detalleDe = (gasto: ReturnType<typeof historial>['gastos'][number]) => {
  const centimos = Math.round(gasto.importe * 100);
  const base = Math.floor(centimos / gasto.participantes.length);
  const sobran = centimos % gasto.participantes.length;
  return {
    ...gasto,
    creado_por: ID_DE['Adriana'],
    repartos: gasto.participantes.map((id, i) => ({
      usuario_id: id,
      nombre: NOMBRE_DE[id],
      abandonado: false,
      importe: (base + (i < sobran ? 1 : 0)) / 100,
    })),
  };
};

// Saldo de cada miembro a partir del historial: lo pagado menos su parte, repartida a partes iguales en
// céntimos (los que sobran, para los primeros), como hace el backend
const balance = () => {
  const cuentas = new Map(Object.entries(ID_DE).map(([nombre, id]) => [id, { nombre, pagado: 0, parte: 0 }]));
  for (const gasto of historial().gastos) {
    const centimos = Math.round(gasto.importe * 100);
    cuentas.get(gasto.pagado_por)!.pagado += centimos;
    gasto.participantes.forEach((id, i) => {
      const base = Math.floor(centimos / gasto.participantes.length);
      cuentas.get(id)!.parte += base + (i < centimos % gasto.participantes.length ? 1 : 0);
    });
  }
  // Una deuda marcada cuenta como un pago de quien debe y como una parte de quien recibe, como en el backend
  for (const { de, importe } of marcadas) {
    cuentas.get(de)!.pagado += Math.round(importe * 100);
    cuentas.get(ID_DE['Adriana'])!.parte += Math.round(importe * 100);
  }
  const saldos = [...cuentas].map(([id, { nombre, pagado, parte }]) => ({
    usuario_id: id,
    nombre,
    pagado: pagado / 100,
    parte: parte / 100,
    saldo: (pagado - parte) / 100,
  }));
  return { saldos };
};

// Transferencias para saldar los saldos del escenario: cada deudor paga a los acreedores hasta quedar a 0
const liquidacion = () => {
  const cuentas = balance().saldos.map((s) => ({ ...s, centimos: Math.round(s.saldo * 100) }));
  const transferencias: Record<string, unknown>[] = [];
  for (const deudor of cuentas.filter((c) => c.centimos < 0)) {
    for (const acreedor of cuentas.filter((c) => c.centimos > 0)) {
      const centimos = Math.min(-deudor.centimos, acreedor.centimos);
      if (centimos === 0) continue;
      transferencias.push({
        de: deudor.usuario_id,
        de_nombre: deudor.nombre,
        a: acreedor.usuario_id,
        a_nombre: acreedor.nombre,
        importe: centimos / 100,
      });
      deudor.centimos += centimos;
      acreedor.centimos -= centimos;
    }
  }
  const saldadas = marcadas.map(({ de, importe }) => ({
    de,
    de_nombre: NOMBRE_DE[de],
    a: ID_DE['Adriana'],
    a_nombre: 'Adriana',
    importe,
  }));
  return { transferencias, saldadas };
};

// Se registra después de la ruta de viajes, así que tiene prioridad para /viajes/:id/gastos
const simularGastos = async () => {
  await paginaActual().route('**/api/viajes/*/gastos/balance', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(balance()) }),
  );
  await paginaActual().route('**/api/viajes/*/gastos/liquidacion', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(liquidacion()) }),
  );
  await paginaActual().route('**/api/viajes/*/gastos', (route) => {
    // Historial de Control de Gastos con lo registrado en el escenario
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(historial()) });
    }
    if (rechazaPorViajeCerrado) {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está finalizado y ya no se puede modificar' },
        }),
      });
    }
    const gasto = route.request().postDataJSON() as GastoRecibido;
    gastos.push(gasto);
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ id: `gasto-${gastos.length}`, ...gasto, repartos: [] }),
    });
  });

  // Deshacer la marca de una deuda: DELETE /gastos/saldadas/:deudorId (dos segmentos, no lo cubre la ruta de abajo)
  await paginaActual().route('**/api/viajes/*/gastos/saldadas/*', (route) => {
    const deudor = new URL(route.request().url()).pathname.split('/').pop();
    marcadas = marcadas.filter((m) => m.de !== deudor);
    return route.fulfill({ status: 204, body: '' });
  });

  // Detalle, edición y borrado de un gasto del historial. Se registra el último, así que tiene prioridad
  await paginaActual().route('**/api/viajes/*/gastos/*', (route) => {
    const peticion = route.request();
    const ultimo = new URL(peticion.url()).pathname.split('/').pop();
    if (ultimo === 'balance' || ultimo === 'liquidacion') return route.fallback();
    // Marcar una deuda: solo si coincide con la transferencia que se debe ahora (si no, 409 como el backend)
    if (peticion.method() === 'POST' && ultimo === 'saldadas') {
      const { de_usuario_id: deudor, importe } = peticion.postDataJSON() as { de_usuario_id: string; importe: number };
      const pendiente = (liquidacion().transferencias as { de: string; a: string; importe: number }[]).find(
        (t) => t.de === deudor && t.a === ID_DE['Adriana'],
      );
      if (!pendiente || Math.round(pendiente.importe * 100) !== Math.round(importe * 100)) {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: { codigo: 'deuda_cambiada', mensaje: 'La deuda ha cambiado: actualiza la liquidación antes de marcarla' } }),
        });
      }
      const existente = marcadas.find((m) => m.de === deudor);
      if (existente) existente.importe += importe;
      else marcadas.push({ de: deudor, importe });
      return route.fulfill({ status: 204, body: '' });
    }

    const gasto = historial().gastos.find((g) => g.id === ultimo);
    if (!gasto) {
      return route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: { codigo: 'gasto_no_encontrado', mensaje: 'El gasto no existe o no pertenece a este viaje' } }),
      });
    }
    if (peticion.method() === 'DELETE') {
      borrados.push(gasto.concepto);
      return route.fulfill({ status: 204, body: '' });
    }
    if (peticion.method() === 'PATCH') {
      const cuerpo = peticion.postDataJSON() as GastoRecibido;
      editados.push(cuerpo);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...gasto, ...cuerpo, repartos: [] }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detalleDe(gasto)) });
  });
};

// Fila de un miembro en «Dividir entre»
const filaDelReparto = (nombre: string) =>
  paginaActual().locator('label').filter({ has: paginaActual().getByLabel(`Dividir con ${nombre}`) });

Given('que el servidor rechaza los gastos porque el viaje está finalizado', () => {
  rechazaPorViajeCerrado = true;
});

When('abro la pantalla para añadir un gasto al viaje {string}', async (nombre: string) => {
  const id = idDelViaje(nombre);
  expect(id, `el viaje "${nombre}" no está preparado`).toBeDefined();
  await simularGastos();
  await paginaActual().goto(new URL(`/viajes/${id}/gastos/nuevo`, paginaActual().url()).toString());
  await expect(paginaActual().getByText('Añadir Gasto', { exact: true })).toBeVisible();
  await expect(paginaActual().getByRole('radiogroup', { name: 'Quién pagó' })).toBeVisible();
});

When('relleno el gasto con importe {string} y concepto {string}', async (importe: string, concepto: string) => {
  await paginaActual().getByLabel('Importe').fill(importe);
  await paginaActual().getByLabel('Concepto').fill(concepto);
});

When('elijo que ha pagado {string}', async (nombre: string) => {
  await paginaActual().getByRole('radio', { name: nombre }).click();
});

When('quito del reparto a {string}', async (nombre: string) => {
  await paginaActual().getByLabel(`Dividir con ${nombre}`).uncheck();
});

Then('la parte de {string} es {string}', async (nombre: string, parte: string) => {
  await expect(filaDelReparto(nombre).getByText(/€$/)).toHaveText(sinCentimosEnteros(parte));
});

Then('estoy en el control de gastos del viaje', async () => {
  await expect(paginaActual()).toHaveURL(/\/viajes\/viaje-\d+\/gastos$/);
  await expect(paginaActual().getByText('Control de Gastos', { exact: true })).toBeVisible();
});

Then('sigo en la pantalla de añadir gasto', async () => {
  await expect(paginaActual()).toHaveURL(/\/gastos\/nuevo$/);
});

Then(
  'el servidor ha guardado el gasto {string} de {float} pagado por {string} entre {string}',
  (concepto: string, importe: number, pagador: string, participantes: string) => {
    expect(gastos).toEqual([
      {
        concepto,
        importe,
        categoria: 'comida',
        pagado_por: ID_DE[pagador],
        participantes: participantes.split(', ').map((nombre) => ID_DE[nombre]),
      },
    ]);
  },
);

Then('el servidor no ha guardado ningún gasto', () => {
  expect(gastos).toEqual([]);
});

// Historial (PB-24)

// Filas del historial de Control de Gastos
const filasDelHistorial = () =>
  paginaActual().getByRole('list', { name: 'Historial de gastos' }).getByRole('listitem');

Given(
  'que en el viaje {string} hay un gasto {string} de {float} pagado por {string} el {string}',
  (viaje: string, concepto: string, importe: number, pagador: string, fecha: string) => {
    expect(idDelViaje(viaje), `el viaje "${viaje}" no está preparado`).toBeDefined();
    previos.push({ concepto, importe, categoria: 'comida', pagado_por: ID_DE[pagador], participantes: [], fecha });
  },
);

When('abro el control de gastos del viaje {string}', async (nombre: string) => {
  const id = idDelViaje(nombre);
  expect(id, `el viaje "${nombre}" no está preparado`).toBeDefined();
  await simularGastos();
  await paginaActual().goto(new URL(`/viajes/${id}/gastos`, paginaActual().url()).toString());
  await expect(paginaActual().getByRole('region', { name: 'Total gastado' })).toBeVisible();
});

Then('el total gastado es {string}', async (total: string) => {
  await expect(paginaActual().getByRole('region', { name: 'Total gastado' })).toContainText(sinCentimosEnteros(total));
});

// Conceptos separados por comas, en el orden en que deben aparecer
Then('veo en el historial de gastos, por este orden, {string}', async (conceptos: string) => {
  const esperados = conceptos.split(', ');
  await expect(filasDelHistorial()).toHaveCount(esperados.length);
  for (const [i, concepto] of esperados.entries()) {
    await expect(filasDelHistorial().nth(i)).toContainText(concepto);
  }
});

Then('el gasto {string} lo pagó {string} el {string}', async (concepto: string, pagador: string, fecha: string) => {
  await expect(filasDelHistorial().filter({ hasText: concepto })).toContainText(`Pagó ${pagador} · ${fecha}`);
});

// Balance (PB 25)

Given(
  'que en el viaje {string} hay un gasto {string} de {float} pagado por {string} entre {string}',
  (viaje: string, concepto: string, importe: number, pagador: string, participantes: string) => {
    expect(idDelViaje(viaje), `el viaje "${viaje}" no está preparado`).toBeDefined();
    previos.push({
      concepto,
      importe,
      categoria: 'comida',
      pagado_por: ID_DE[pagador],
      participantes: participantes.split(', ').map((nombre) => ID_DE[nombre]),
      fecha: '2027-05-12',
    });
  },
);

Then('mi saldo es {string} y {string}', async (saldo: string, estado: string) => {
  const tuSaldo = paginaActual().getByRole('group', { name: 'Tu saldo' });
  await expect(tuSaldo).toContainText(sinCentimosEnteros(saldo));
  await expect(tuSaldo).toContainText(estado);
});

Then('el saldo de {string} es {string}', async (nombre: string, saldo: string) => {
  const fila = paginaActual()
    .getByRole('list', { name: 'Saldo de cada miembro' })
    .getByRole('listitem')
    .filter({ hasText: nombre });
  await expect(fila).toContainText(sinCentimosEnteros(saldo));
});

// Liquidación pendiente (PB-28): transferencias propuestas, con quién paga, a quién y cuánto
Then('en la liquidación pendiente veo {string} con {string}', async (texto: string, importe: string) => {
  const fila = paginaActual()
    .getByRole('list', { name: 'Transferencias pendientes' })
    .getByRole('listitem')
    .filter({ hasText: texto });
  await expect(fila).toContainText(sinCentimosEnteros(importe));
});

Then('en la liquidación pendiente veo {string}', async (texto: string) => {
  await expect(paginaActual().getByRole('region', { name: 'Liquidación' })).toContainText(texto);
});

// Detalle, modificar y eliminar (PB-29)

When('abro el detalle del gasto {string}', async (concepto: string) => {
  await paginaActual().getByRole('button', { name: `Ver el detalle de ${concepto}` }).click();
  await expect(paginaActual().getByRole('region', { name: 'Datos del gasto' })).toBeVisible();
});

When('cambio el importe a {string}', async (importe: string) => {
  await paginaActual().getByLabel('Importe').fill(importe);
});

When('confirmo la eliminación', async () => {
  await paginaActual().getByRole('button', { name: 'Eliminar gasto' }).click();
});

Then('estoy en el detalle del gasto', async () => {
  await expect(paginaActual()).toHaveURL(/\/viajes\/viaje-\d+\/gastos\/gasto-\d+$/);
  await expect(paginaActual().getByRole('region', { name: 'Datos del gasto' })).toBeVisible();
});

Then('en el detalle veo el importe {string}', async (importe: string) => {
  await expect(paginaActual().getByRole('region', { name: 'Datos del gasto' })).toContainText(sinCentimosEnteros(importe));
});

Then('en el reparto del gasto la parte de {string} es {string}', async (nombre: string, parte: string) => {
  const fila = paginaActual()
    .getByRole('list', { name: 'Parte de cada miembro' })
    .getByRole('listitem')
    .filter({ hasText: nombre });
  await expect(fila).toContainText(sinCentimosEnteros(parte));
});

Then(
  'el servidor ha guardado la edición del gasto {string} con importe {float} entre {string}',
  (concepto: string, importe: number, participantes: string) => {
    expect(editados).toEqual([
      {
        concepto,
        importe,
        categoria: 'comida',
        pagado_por: ID_DE['Berta'],
        participantes: participantes.split(', ').map((nombre) => ID_DE[nombre]),
        fecha: '2027-05-12',
      },
    ]);
  },
);

Then('el servidor ha borrado el gasto {string}', (concepto: string) => {
  expect(borrados).toEqual([concepto]);
});

Then('el servidor no ha borrado ningún gasto', () => {
  expect(borrados).toEqual([]);
});

// Deudas saldadas (PB-28): quien recibe el dinero la marca o la deshace
Then('en las deudas saldadas veo {string}', async (texto: string) => {
  await expect(paginaActual().getByRole('region', { name: 'Deudas saldadas' })).toContainText(texto);
});

Then('no veo las deudas saldadas', async () => {
  await expect(paginaActual().getByRole('region', { name: 'Deudas saldadas' })).toHaveCount(0);
});
