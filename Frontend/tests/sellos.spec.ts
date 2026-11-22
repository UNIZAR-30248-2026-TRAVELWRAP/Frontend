import { test, expect, type Page, type Route } from '@playwright/test';

const EMAIL = 'adriana@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const BERTA_ID = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f';
const VIAJE_ID = 'roma';

const sesion = {
  usuario: { id: USUARIO_ID, nombre: 'Adriana', email: EMAIL, avatar_url: null, creado_en: '2026-10-06T15:29:32Z' },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
};

const viaje = {
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 850,
  estado: 'finalizado',
  archivado: false,
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'miembro',
  miembros: [
    { usuario_id: BERTA_ID, nombre: 'Berta', avatar_url: null, rol: 'creador' },
    { usuario_id: USUARIO_ID, nombre: 'Adriana', avatar_url: null, rol: 'miembro' },
  ],
};

const RESUMEN = { dias: 4, actividad_mas_votada: null, alma_del_grupo: null };

type Sello = { id: string; viaje_id: string | null; diseno: string; destino: string; anio: number; elegido_en: string };

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

// Backend simulado con los sellos del usuario en memoria, compartidos entre el resumen y el perfil
const simularBackend = async (page: Page, sellos: Sello[] = []) => {
  const nuevoId = () => `s${sellos.length + 1}`;

  await page.route('**/api/viajes', (route) => json(route, 200, { viajes: [] }));
  await page.route('**/api/viajes/**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    if (ruta === `/viajes/${VIAJE_ID}/sello`) {
      const propio = sellos.find((s) => s.viaje_id === VIAJE_ID);
      if (peticion.method() === 'PUT') {
        const { diseno } = peticion.postDataJSON();
        if (propio) propio.diseno = diseno;
        else sellos.push({ id: nuevoId(), viaje_id: VIAJE_ID, diseno, destino: 'Roma', anio: 2027, elegido_en: new Date().toISOString() });
        return json(route, 200, { sello: sellos.find((s) => s.viaje_id === VIAJE_ID) });
      }
      if (peticion.method() === 'DELETE') {
        sellos.splice(0, sellos.length, ...sellos.filter((s) => s.viaje_id !== VIAJE_ID));
        return route.fulfill({ status: 204 });
      }
      return json(route, 200, { sello: propio ?? null });
    }
    if (ruta === `/viajes/${VIAJE_ID}/resumen`) return json(route, 200, RESUMEN);
    if (ruta === `/viajes/${VIAJE_ID}/fotos`) return json(route, 200, { fotos: [] });
    return json(route, 200, viaje);
  });

  await page.route('**/api/perfil/sellos**', async (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    if (ruta === '/perfil/sellos') return json(route, 200, { sellos });
    const selloId = ruta.split('/')[3];
    const sello = sellos.find((s) => s.id === selloId);
    if (!sello) return json(route, 404, { error: { codigo: 'sello_no_encontrado', mensaje: 'El sello no existe' } });
    if (peticion.method() === 'PATCH') {
      sello.diseno = peticion.postDataJSON().diseno;
      return json(route, 200, { sello });
    }
    sellos.splice(sellos.indexOf(sello), 1);
    return route.fulfill({ status: 204 });
  });

  return sellos;
};

const llegarALaUltima = async (page: Page) => {
  await page.goto(`/viajes/${VIAJE_ID}/resumen`);
  await expect(page.getByText('TravelWrap · Resumen')).toBeVisible();
  for (let i = 0; i < 2; i++) await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Sellar' })).toBeVisible();
};

test.describe('Sellos de viaje', () => {
  test.use({ reducedMotion: 'reduce' });

  test('elegir el sello en el resumen lo deja en la colección del perfil', async ({ page }) => {
    await entrarConSesion(page);
    const sellos = await simularBackend(page);

    await llegarALaUltima(page);
    await page.getByRole('button', { name: 'Sellar' }).click();
    const selector = page.getByRole('dialog');
    await expect(selector.getByText('Ningún sello seleccionado')).toBeVisible();
    await selector.getByRole('button', { name: 'Sello 3: Ruta' }).click();
    await selector.getByRole('button', { name: 'Elegir' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(sellos).toHaveLength(1);
    expect(sellos[0].diseno).toBe('ruta');

    await page.goto('/perfil');
    await expect(page.getByText('1 sello conseguido')).toBeVisible();
    await page.getByRole('button', { name: /Mi colección de sellos/ }).click();
    await expect(page.getByRole('dialog', { name: /Pasaporte de viajes/ }).getByRole('img', { name: 'Sello de Roma 2027' })).toBeVisible();
  });

  test('cambiar y quitar un sello desde el pasaporte', async ({ page }) => {
    await entrarConSesion(page);
    const sellos = await simularBackend(page, [
      { id: 's1', viaje_id: VIAJE_ID, diseno: 'mapa', destino: 'Roma', anio: 2027, elegido_en: '2027-05-20T10:00:00Z' },
    ]);

    await page.goto('/perfil');
    await page.getByRole('button', { name: /Mi colección de sellos/ }).click();
    await page.getByRole('button', { name: 'Cambiar el sello de Roma 2027' }).click();
    const selector = page.getByRole('dialog').nth(1);
    await expect(selector.getByRole('button', { name: 'Sello 2: Mapa' })).toHaveAttribute('aria-pressed', 'true');
    await selector.getByRole('button', { name: 'Sello 4: Avión' }).click();
    await selector.getByRole('button', { name: 'Elegir' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(1);
    expect(sellos[0].diseno).toBe('avion');

    await page.getByRole('button', { name: 'Cambiar el sello de Roma 2027' }).click();
    await page.getByRole('dialog').nth(1).getByRole('button', { name: 'Deseleccionar todos' }).click();
    await page.getByRole('dialog').nth(1).getByRole('button', { name: 'Elegir' }).click();
    await expect(page.getByText('Aún no tienes sellos. Termina un viaje para conseguir el primero')).toBeVisible();
    expect(sellos).toHaveLength(0);
  });

  test('sin sellos el perfil dice 0 y el pasaporte está vacío', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);

    await page.goto('/perfil');
    await expect(page.getByText('0 sellos conseguidos')).toBeVisible();
    await page.getByRole('button', { name: /Mi colección de sellos/ }).click();
    await expect(page.getByText('Aún no tienes sellos. Termina un viaje para conseguir el primero')).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
