import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, cerrarSesion } from '../src/services/authApi'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cerrarSesion', () => {
  it('envía un POST a /auth/logout con el token en la cabecera Authorization', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)

    await cerrarSesion('token-acceso')

    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/auth\/logout$/)
    expect(opciones.method).toBe('POST')
    expect((opciones.headers as Record<string, string>).Authorization).toBe('Bearer token-acceso')
  })

  it('no envía cuerpo ni Content-Type', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)

    await cerrarSesion('token-acceso')

    const [, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(opciones.body).toBeUndefined()
    expect((opciones.headers as Record<string, string>)['Content-Type']).toBeUndefined()
  })

  it('se resuelve sin error cuando el backend responde 204 sin contenido', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))))

    await expect(cerrarSesion('token-acceso')).resolves.toBeNull()
  })

  it('lanza ApiError 401 si la sesión ya no es válida', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { codigo: 'sesion_invalida', mensaje: 'La sesión ha caducado o no es válida' } }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ))

    const error = await cerrarSesion('caducado').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.estado).toBe(401)
    expect(error.codigo).toBe('sesion_invalida')
  })

  it('lanza ApiError 502 si el backend no puede cerrar la sesión', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { codigo: 'error_autenticacion', mensaje: 'No se ha podido cerrar la sesión' } }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    ))

    const error = await cerrarSesion('token-acceso').catch((e) => e)

    expect(error.estado).toBe(502)
    expect(error.codigo).toBe('error_autenticacion')
  })

  it('lanza ApiError sin_conexion si el servidor no responde', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

    const error = await cerrarSesion('token-acceso').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.codigo).toBe('sin_conexion')
  })
})
