import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import { obtenerEnlaceInvitacion, unirseAViaje } from '../src/services/invitacionesApi'

const VIAJE_ID = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const TOKEN_INVITACION = '3f2b8c1d9e7a4f60b5d2c8a1e9f04b37'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

const llamada = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('obtenerEnlaceInvitacion', () => {
  it('pide el enlace del viaje con el token de sesión y lo devuelve', async () => {
    const enlace = { token: TOKEN_INVITACION, enlace: `http://localhost:5173/unirse/${TOKEN_INVITACION}` }
    const fetchMock = vi.fn(() => respuesta(200, enlace))
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await obtenerEnlaceInvitacion(VIAJE_ID, 'token-acceso')

    expect(resultado).toEqual(enlace)
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/invitacion$`))
    expect(opciones.method).toBe('GET')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(opciones.body).toBeUndefined()
  })

  it('lanza ApiError si el usuario no pertenece al viaje', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(404, {
        error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' },
      }),
    ))

    const error = await obtenerEnlaceInvitacion(VIAJE_ID, 'token-acceso').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.estado).toBe(404)
    expect(error.codigo).toBe('viaje_no_encontrado')
  })
})

describe('unirseAViaje', () => {
  it('envía un POST a /invitaciones/{token}/unirse con el token de sesión', async () => {
    const unido = {
      viaje: { id: VIAJE_ID, nombre: 'Roma 2025', destino: 'Roma, Italia', imagen_portada_url: null },
      miembro: { rol: 'miembro', unido_en: '2026-10-11T16:30:00Z' },
      ya_era_miembro: false,
    }
    const fetchMock = vi.fn(() => respuesta(200, unido))
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await unirseAViaje(TOKEN_INVITACION, 'token-acceso')

    expect(resultado).toEqual(unido)
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/invitaciones/${TOKEN_INVITACION}/unirse$`))
    expect(opciones.method).toBe('POST')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
  })

  it('lanza ApiError con el código del backend si el enlace no es válido', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(404, {
        error: { codigo: 'invitacion_no_encontrada', mensaje: 'El enlace de invitación no es válido' },
      }),
    ))

    const error = await unirseAViaje('token-invalido', 'token-acceso').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.codigo).toBe('invitacion_no_encontrada')
  })
})
