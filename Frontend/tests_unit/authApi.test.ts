import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, login, refrescar } from '../src/services/authApi'

const sesion = {
  usuario: {
    id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
    nombre: null,
    email: 'daniel@travelwrap.app',
    avatar_url: null,
    creado_en: '2026-10-06T15:29:32Z',
  },
  token: 'token-acceso',
  refresh_token: 'token-refresco',
}

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('login', () => {
  it('envía email y contraseña a /auth/login y devuelve la sesión', async () => {
    const fetchMock = vi.fn(() => respuesta(200, sesion))
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await login('daniel@travelwrap.app', 'secreta123')

    expect(resultado).toEqual(sesion)
    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/auth\/login$/)
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body as string)).toEqual({
      email: 'daniel@travelwrap.app',
      password: 'secreta123',
    })
  })

  it('lanza ApiError con el código y mensaje del backend si las credenciales son inválidas', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(401, {
        error: { codigo: 'credenciales_invalidas', mensaje: 'Email o contraseña incorrectos' },
      }),
    ))

    const error = await login('daniel@travelwrap.app', 'mala').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.estado).toBe(401)
    expect(error.codigo).toBe('credenciales_invalidas')
    expect(error.message).toBe('Email o contraseña incorrectos')
  })

  it('lanza ApiError sin_conexion si el servidor no responde', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

    const error = await login('daniel@travelwrap.app', 'secreta123').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.estado).toBe(0)
    expect(error.codigo).toBe('sin_conexion')
  })

  it('usa un mensaje genérico si la respuesta de error no tiene cuerpo JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('', { status: 500 }))))

    const error = await login('daniel@travelwrap.app', 'secreta123').catch((e) => e)

    expect(error.estado).toBe(500)
    expect(error.codigo).toBe('error_desconocido')
    expect(error.message).toBe('Ha ocurrido un error')
  })
})

describe('refrescar', () => {
  it('envía el refresh_token a /auth/refresh y devuelve los tokens nuevos', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { token: 'nuevo', refresh_token: 'nuevo-refresco' }))
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await refrescar('token-refresco')

    expect(resultado).toEqual({ token: 'nuevo', refresh_token: 'nuevo-refresco' })
    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/auth\/refresh$/)
    expect(JSON.parse(opciones.body as string)).toEqual({ refresh_token: 'token-refresco' })
  })

  it('lanza ApiError 401 si la sesión ha caducado', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(401, {
        error: { codigo: 'sesion_invalida', mensaje: 'La sesión ha caducado o no es válida' },
      }),
    ))

    const error = await refrescar('caducado').catch((e) => e)

    expect(error.estado).toBe(401)
    expect(error.codigo).toBe('sesion_invalida')
  })
})
