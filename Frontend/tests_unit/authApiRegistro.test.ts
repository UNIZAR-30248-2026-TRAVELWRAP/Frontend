import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, reenviarConfirmacion, registrar } from '../src/services/authApi'

const usuario = {
  id: 'df77cba6-4be5-4cbc-814b-1e228dd73dcc',
  nombre: 'Daniel',
  email: 'daniel@travelwrap.app',
  avatar_url: null,
  creado_en: '2026-10-11T18:00:00Z',
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

describe('registrar', () => {
  it('envía nombre, email y contraseña a /auth/registro', async () => {
    const fetchMock = vi.fn(() => respuesta(201, { usuario, confirmacion_pendiente: true }))
    vi.stubGlobal('fetch', fetchMock)

    await registrar('Daniel', 'daniel@travelwrap.app', 'secreta123')

    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/auth\/registro$/)
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body as string)).toEqual({
      nombre: 'Daniel',
      email: 'daniel@travelwrap.app',
      password: 'secreta123',
    })
  })

  it('devuelve la confirmación pendiente cuando hay que confirmar el email', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(201, { usuario, confirmacion_pendiente: true })))

    const resultado = await registrar('Daniel', 'daniel@travelwrap.app', 'secreta123')

    expect(resultado).toEqual({ usuario, confirmacion_pendiente: true })
    expect('token' in resultado).toBe(false)
  })

  it('devuelve la sesión cuando el proyecto no exige confirmar el email', async () => {
    const sesion = { usuario, token: 'token-acceso', refresh_token: 'token-refresco' }
    vi.stubGlobal('fetch', vi.fn(() => respuesta(201, sesion)))

    const resultado = await registrar('Daniel', 'daniel@travelwrap.app', 'secreta123')

    expect(resultado).toEqual(sesion)
    expect('token' in resultado).toBe(true)
  })

  it('lanza ApiError 409 con el mensaje del backend si el email ya está registrado', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(409, { error: { codigo: 'email_en_uso', mensaje: 'Ya existe una cuenta con ese email' } }),
    ))

    const error = await registrar('Daniel', 'daniel@travelwrap.app', 'secreta123').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.estado).toBe(409)
    expect(error.codigo).toBe('email_en_uso')
    expect(error.message).toBe('Ya existe una cuenta con ese email')
  })

  it('lanza ApiError 400 si el backend rechaza los datos', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(400, { error: { codigo: 'datos_invalidos', mensaje: 'El email no es válido' } }),
    ))

    const error = await registrar('Daniel', 'no-es-email', 'secreta123').catch((e) => e)

    expect(error.estado).toBe(400)
    expect(error.codigo).toBe('datos_invalidos')
  })

  it('lanza ApiError sin_conexion si el servidor no responde', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

    const error = await registrar('Daniel', 'daniel@travelwrap.app', 'secreta123').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.codigo).toBe('sin_conexion')
  })
})

describe('reenviarConfirmacion', () => {
  it('envía el email a /auth/reenviar-confirmacion', async () => {
    const fetchMock = vi.fn(() => respuesta(202, { mensaje: 'ok' }))
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await reenviarConfirmacion('daniel@travelwrap.app')

    expect(resultado).toEqual({ mensaje: 'ok' })
    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/\/auth\/reenviar-confirmacion$/)
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body as string)).toEqual({ email: 'daniel@travelwrap.app' })
  })

  it('lanza ApiError 429 si se piden demasiados correos seguidos', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(429, {
        error: { codigo: 'demasiados_intentos', mensaje: 'Espera un momento antes de volver a pedir el correo' },
      }),
    ))

    const error = await reenviarConfirmacion('daniel@travelwrap.app').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.estado).toBe(429)
    expect(error.codigo).toBe('demasiados_intentos')
  })
})
