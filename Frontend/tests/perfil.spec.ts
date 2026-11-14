import { fileURLToPath } from 'node:url';
import { test, expect, type Page, type Route } from '@playwright/test';

const EMAIL = 'daniel@travelwrap.app';
const USUARIO_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc';
const FOTO = `https://proyecto.supabase.co/storage/v1/object/public/avatares/${USUARIO_ID}/0a1b2c3d.jpg`;
const PNG_PEQUENO = fileURLToPath(new URL('./archivos/avatar.png', import.meta.url));

type Usuario = {
  id: string;
  nombre: string;
  email: string;
  avatar_url: string | null;
  creado_en: string;
};

const sesion = (cambios: Partial<Usuario> = {}) => ({
  usuario: {
    id: USUARIO_ID,
    nombre: 'Daniel Blasco',
    email: EMAIL,
    avatar_url: null,
    creado_en: '2026-10-06T15:29:32Z',
    ...cambios,
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
});

// Sesión guardada como la deja el login, solo en la primera carga: así sobrevive a las recargas de la prueba
const entrarConSesion = async (page: Page, cambios: Partial<Usuario> = {}) => {
  await page.addInitScript((datos) => {
    if (!sessionStorage.getItem('sesionSembrada')) {
      localStorage.setItem('travelwrap.sesion', JSON.stringify(datos));
      sessionStorage.setItem('sesionSembrada', '1');
    }
  }, sesion(cambios));
  await page.route('**/api/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'token-acceso', refresh_token: 'token-refresco' }),
    }),
  );
};

const json = (route: Route, status: number, cuerpo: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) });

type Peticion = { metodo: string; autorizacion: string | undefined; tipo: string | undefined; cuerpo: string };

type Respuestas = {
  nombre?: { status: number; cuerpo?: unknown };
  subida?: { status: number; cuerpo?: unknown };
  borrado?: { status: number; cuerpo?: unknown };
};

// Backend simulado: «Mis viajes» vacío y /perfil, que guarda el usuario como lo haría el servidor. Devuelve
// las peticiones recibidas para comprobar qué ha enviado la pantalla
const simularBackend = async (page: Page, inicial: Partial<Usuario> = {}, respuestas: Respuestas = {}) => {
  const recibidas: Peticion[] = [];
  let usuario: Usuario = sesion(inicial).usuario;

  await page.route('**/api/viajes', (route) => json(route, 200, { viajes: [] }));
  await page.route('**/api/perfil**', (route) => {
    const peticion = route.request();
    const ruta = new URL(peticion.url()).pathname.replace(/^.*\/api/, '');
    recibidas.push({
      metodo: peticion.method(),
      autorizacion: peticion.headers()['authorization'],
      tipo: peticion.headers()['content-type'],
      cuerpo: peticion.postData() ?? '',
    });

    if (ruta === '/perfil' && peticion.method() === 'PATCH') {
      const { nombre } = JSON.parse(peticion.postData() ?? '{}');
      if (respuestas.nombre && respuestas.nombre.status !== 200) {
        return json(route, respuestas.nombre.status, respuestas.nombre.cuerpo);
      }
      usuario = { ...usuario, nombre };
      return json(route, 200, { usuario });
    }
    if (ruta === '/perfil/avatar' && peticion.method() === 'PUT') {
      if (respuestas.subida && respuestas.subida.status !== 200) {
        return json(route, respuestas.subida.status, respuestas.subida.cuerpo);
      }
      usuario = { ...usuario, avatar_url: FOTO };
      return json(route, 200, { usuario });
    }
    if (ruta === '/perfil/avatar' && peticion.method() === 'DELETE') {
      if (respuestas.borrado && respuestas.borrado.status !== 200) {
        return json(route, respuestas.borrado.status, respuestas.borrado.cuerpo);
      }
      usuario = { ...usuario, avatar_url: null };
      return json(route, 200, { usuario });
    }
    return json(route, 404, { error: { codigo: 'no_encontrado', mensaje: 'No existe' } });
  });
  // La foto del bucket público
  await page.route('https://proyecto.supabase.co/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    }),
  );

  return recibidas;
};

const botonAvatar = (page: Page) => page.getByRole('button', { name: 'Cambiar foto de perfil' });
const imagenDelAvatar = (page: Page) => botonAvatar(page).locator('img');
const sesionGuardada = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('travelwrap.sesion') ?? 'null'));

test.describe('PB-36 · Editar el nombre', () => {
  test('el nombre nuevo se ve en «Mi Perfil» y en la cabecera de «Mis viajes»', async ({ page }) => {
    await entrarConSesion(page);
    const recibidas = await simularBackend(page);
    await page.goto('/perfil');

    await page.getByRole('button', { name: 'Editar nombre' }).click();
    await page.getByRole('textbox', { name: 'Nombre' }).fill('  Ana Pérez  ');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByText('Ana Pérez')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveCount(0);
    expect(recibidas).toHaveLength(1);
    expect(recibidas[0].metodo).toBe('PATCH');
    expect(recibidas[0].autorizacion).toBe('Bearer token-acceso');
    expect(JSON.parse(recibidas[0].cuerpo)).toEqual({ nombre: 'Ana Pérez' });

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByText('Hola, Ana Pérez')).toBeVisible();
  });

  test('un nombre vacío no se puede guardar', async ({ page }) => {
    await entrarConSesion(page);
    const recibidas = await simularBackend(page);
    await page.goto('/perfil');

    await page.getByRole('button', { name: 'Editar nombre' }).click();
    await page.getByRole('textbox', { name: 'Nombre' }).fill('   ');

    await expect(page.getByRole('alert')).toHaveText('Escribe tu nombre');
    await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled();
    expect(recibidas).toHaveLength(0);
  });

  test('si el servidor rechaza el nombre, se ve el error y no cambia', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, {}, {
      nombre: {
        status: 400,
        cuerpo: { error: { codigo: 'datos_invalidos', mensaje: 'El nombre debe tener entre 1 y 100 caracteres' } },
      },
    });
    await page.goto('/perfil');

    await page.getByRole('button', { name: 'Editar nombre' }).click();
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
    await page.getByRole('button', { name: 'Guardar' }).click();

    await expect(page.getByRole('alert')).toHaveText('El nombre debe tener entre 1 y 100 caracteres');
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toHaveValue('Ana');
    expect((await sesionGuardada(page)).usuario.nombre).toBe('Daniel Blasco');
  });

  test('Escape cancela la edición y se mantiene el nombre', async ({ page }) => {
    await entrarConSesion(page);
    const recibidas = await simularBackend(page);
    await page.goto('/perfil');

    await page.getByRole('button', { name: 'Editar nombre' }).click();
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana');
    await page.keyboard.press('Escape');

    await expect(page.getByText('Daniel Blasco')).toBeVisible();
    expect(recibidas).toHaveLength(0);
  });

  test('al recargar se conserva el nombre nuevo', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);
    await page.goto('/perfil');
    await page.getByRole('button', { name: 'Editar nombre' }).click();
    await page.getByRole('textbox', { name: 'Nombre' }).fill('Ana Pérez');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByText('Ana Pérez')).toBeVisible();

    await page.reload();

    await expect(page.getByText('Ana Pérez')).toBeVisible();
    expect((await sesionGuardada(page)).usuario.nombre).toBe('Ana Pérez');
  });
});

test.describe('PB-36 · Editar la foto', () => {
  test('sin foto se ve la inicial y la camarita', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);
    await page.goto('/perfil');

    await expect(botonAvatar(page)).toBeVisible();
    await expect(botonAvatar(page)).toContainText('D');
    await expect(imagenDelAvatar(page)).toHaveCount(0);
  });

  test('al elegir una foto se sube reducida a JPEG y se ve, en el perfil y en «Mis viajes»', async ({ page }) => {
    await entrarConSesion(page);
    const recibidas = await simularBackend(page);
    await page.goto('/perfil');

    await page.getByLabel('Elegir foto de perfil').setInputFiles(PNG_PEQUENO);

    await expect(imagenDelAvatar(page)).toHaveAttribute('src', FOTO);
    expect(recibidas).toHaveLength(1);
    expect(recibidas[0].metodo).toBe('PUT');
    expect(recibidas[0].autorizacion).toBe('Bearer token-acceso');
    expect(recibidas[0].tipo).toContain('multipart/form-data');
    expect(recibidas[0].cuerpo).toContain('name="avatar"');
    expect(recibidas[0].cuerpo).toContain('image/jpeg');

    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByRole('button', { name: `Perfil de ${EMAIL}` }).locator('img')).toHaveAttribute('src', FOTO);
  });

  test('un archivo de otro tipo se rechaza sin llamar a la API', async ({ page }) => {
    await entrarConSesion(page);
    const recibidas = await simularBackend(page);
    await page.goto('/perfil');

    await page.getByLabel('Elegir foto de perfil').setInputFiles({
      name: 'nota.gif',
      mimeType: 'image/gif',
      buffer: Buffer.from('GIF89a'),
    });

    await expect(page.getByRole('alert')).toHaveText('La foto debe ser JPEG o PNG');
    expect(recibidas).toHaveLength(0);
  });

  test('si el servidor rechaza la subida, se ve el error y la foto no cambia', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page, {}, {
      subida: {
        status: 400,
        cuerpo: { error: { codigo: 'archivo_demasiado_grande', mensaje: 'El archivo supera 2 MB' } },
      },
    });
    await page.goto('/perfil');

    await page.getByLabel('Elegir foto de perfil').setInputFiles(PNG_PEQUENO);

    await expect(page.getByRole('alert')).toHaveText('La foto es demasiado grande (máximo 2 MB)');
    await expect(imagenDelAvatar(page)).toHaveCount(0);
    await expect(botonAvatar(page)).toContainText('D');
    expect((await sesionGuardada(page)).usuario.avatar_url).toBeNull();
  });

  test('con foto, «Quitar foto» pide confirmación y al confirmar vuelve la inicial', async ({ page }) => {
    await entrarConSesion(page, { avatar_url: FOTO });
    const recibidas = await simularBackend(page, { avatar_url: FOTO });
    await page.goto('/perfil');
    await expect(imagenDelAvatar(page)).toHaveAttribute('src', FOTO);

    await botonAvatar(page).click();
    await page.getByRole('dialog', { name: 'Foto de perfil' }).getByRole('button', { name: 'Quitar foto' }).click();

    await expect(page.getByRole('dialog')).toContainText('¿Quitar tu foto de perfil?');
    expect(recibidas).toHaveLength(0);

    await page.getByRole('dialog').getByRole('button', { name: 'Quitar foto' }).click();

    await expect(imagenDelAvatar(page)).toHaveCount(0);
    await expect(botonAvatar(page)).toContainText('D');
    expect(recibidas).toHaveLength(1);
    expect(recibidas[0].metodo).toBe('DELETE');
    expect((await sesionGuardada(page)).usuario.avatar_url).toBeNull();
  });

  test('cancelar la confirmación mantiene la foto', async ({ page }) => {
    await entrarConSesion(page, { avatar_url: FOTO });
    const recibidas = await simularBackend(page, { avatar_url: FOTO });
    await page.goto('/perfil');

    await botonAvatar(page).click();
    await page.getByRole('button', { name: 'Quitar foto' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(imagenDelAvatar(page)).toHaveAttribute('src', FOTO);
    expect(recibidas).toHaveLength(0);
  });

  test('al recargar se conserva la foto nueva', async ({ page }) => {
    await entrarConSesion(page);
    await simularBackend(page);
    await page.goto('/perfil');
    await page.getByLabel('Elegir foto de perfil').setInputFiles(PNG_PEQUENO);
    await expect(imagenDelAvatar(page)).toHaveAttribute('src', FOTO);

    await page.reload();

    await expect(imagenDelAvatar(page)).toHaveAttribute('src', FOTO);
    expect((await sesionGuardada(page)).usuario.avatar_url).toBe(FOTO);
  });
});

test.describe('PB-36 · Mi Perfil a 320 px', () => {
  test('un nombre largo no provoca scroll horizontal y se puede editar', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await entrarConSesion(page, { nombre: 'Nombre larguísimo de una persona con muchos apellidos compuestos y más' });
    await simularBackend(page);
    await page.goto('/perfil');

    await expect(page.getByRole('button', { name: 'Editar nombre' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.getByRole('button', { name: 'Editar nombre' }).click();
    await expect(page.getByRole('textbox', { name: 'Nombre' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
