import { test, expect, type Page, type Route } from '@playwright/test';

// Escaneo de documentos con OCR (PB-55): desde la cartera se detecta si es un gasto, una actividad u otro documento
// y la app lleva al usuario a la pantalla de confirmación con los datos leídos, o guarda el resumen en la cartera
const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA_ID = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f';
const VIAJE_ID = 'roma';

const sesion = {
  usuario: { id: USUARIO_ID, nombre: 'Adriana', email: EMAIL, avatar_url: null, creado_en: '2026-10-06T15:29:32Z' },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

const entrarConSesion = async (page: Page) => {
  await page.addInitScript((datos) => {
    if (!sessionStorage.getItem('sesionSembrada')) {
      localStorage.setItem('travelwrap.sesion', JSON.stringify(datos));
      sessionStorage.setItem('sesionSembrada', '1');
    }
  }, sesion);
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: sesion.token, refresh_token: sesion.refresh_token }),
    }),
  );
};

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

const viaje = {
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 850,
  estado: 'activo',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'miembro',
  archivado: false,
  miembros: [
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'creador' },
    { usuario_id: BERTA_ID, nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
};

// Foto de prueba: el navegador solo la envía, el OCR lo simula el backend mockeado
const foto = { name: 'ticket.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]) };

// API simulada de la cartera, el escaneo y el resumen. Devuelve los textos de resumen que ha guardado la app
const simularCartera = async (page: Page, resultadoEscaneo: unknown) => {
  const resumenes: string[] = [];
  await page.route(`**/api/viajes/${VIAJE_ID}`, (route) => json(route, 200, viaje));
  await page.route(`**/api/viajes/${VIAJE_ID}/tareas`, (route) => json(route, 200, { tareas: [] }));
  await page.route(`**/api/viajes/${VIAJE_ID}/documentos`, (route) => {
    if (route.request().method() === 'POST') return json(route, 400, { error: { codigo: 'datos_invalidos', mensaje: 'no usado' } });
    return json(route, 200, { documentos: [] });
  });
  await page.route(`**/api/viajes/${VIAJE_ID}/documentos/texto`, (route) => {
    const { texto } = route.request().postDataJSON() as { texto: string };
    resumenes.push(texto);
    return json(route, 201, {
      id: 'r1',
      viaje_id: VIAJE_ID,
      nombre: 'Resumen escaneado.txt',
      tipo_mime: 'text/plain',
      tamano_bytes: texto.length,
      subido_por: USUARIO_ID,
      creado_en: '2026-11-22T10:00:00Z',
    });
  });
  await page.route(`**/api/viajes/${VIAJE_ID}/gastos/escaneo`, (route) => json(route, 200, resultadoEscaneo));
  return resumenes;
};

// Valores de todos los campos de texto de la pantalla (los que rellena la app, no los atributos del HTML)
const valoresDeCampos = (page: Page) =>
  page.locator('input').evaluateAll((campos) => campos.map((campo) => (campo as HTMLInputElement).value));

const escanearFoto = async (page: Page) => {
  await page.goto(`/viajes/${VIAJE_ID}/documentos`);
  await page.getByRole('button', { name: 'Escanear con OCR' }).click();
  await page.getByRole('dialog', { name: 'Escanear documento' }).waitFor();
  await page.locator('input[type="file"][aria-label="Foto del documento"]').setInputFiles(foto);
};

test.describe('Escanear documento con OCR', () => {
  test('un ticket abre Añadir Gasto con el importe y el concepto leídos, listos para revisar', async ({ page }) => {
    await entrarConSesion(page);
    await simularCartera(page, { tipo: 'gasto', datos: { concepto: 'RESTAURANTE EL FARO', importe: 11.5 } });

    await escanearFoto(page);

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/gastos/nuevo$`));
    await expect.poll(() => valoresDeCampos(page), { timeout: 20000 }).toContain('RESTAURANTE EL FARO');
    await expect.poll(() => valoresDeCampos(page), { timeout: 20000 }).toContain('11,5');
    await expect(page.getByText('Hemos leído estos datos del ticket. Revísalos antes de guardar el gasto.')).toBeVisible();
  });

  test('una reserva abre Añadir Actividad con el título, la fecha y la hora leídos', async ({ page }) => {
    await entrarConSesion(page);
    await simularCartera(page, {
      tipo: 'actividad',
      datos: { titulo: 'Entradas Coliseo', fecha: '2027-05-13', hora_inicio: '10:00' },
    });

    await escanearFoto(page);

    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/actividades/nueva`));
    await expect.poll(() => valoresDeCampos(page)).toContain('Entradas Coliseo');
    await expect.poll(() => valoresDeCampos(page)).toContain('10:00');
  });

  test('otro documento se guarda como resumen .txt en la cartera, sin abrir ninguna pantalla', async ({ page }) => {
    await entrarConSesion(page);
    const resumenes = await simularCartera(page, { tipo: 'otro', datos: { resumen: 'Póliza de seguro\nCobertura total' } });

    await escanearFoto(page);

    await expect(page.getByText('«Resumen escaneado.txt» se ha guardado en la cartera')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/viajes/${VIAJE_ID}/documentos$`));
    expect(resumenes).toEqual(['Póliza de seguro\nCobertura total']);
  });
});
