import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import { crearPuntoInteres, eliminarPuntoInteres, listarPuntosInteres } from '../src/services/puntosInteresApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const llamada = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }]

const punto = {
  id: 'p1',
  viaje_id: VIAJE_ID,
  nombre: 'Fontana di Trevi',
  nota: null,
  categoria: 'cultura',
  latitud: 41.900932,
  longitud: 12.483313,
  lugar_externo_id: 'way/24146600',
  direccion: 'Fontana di Trevi, Piazza di Trevi, Roma',
  creado_por: 'u1',
  creado_en: '2026-11-22T10:00:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('puntosInteresApi · listarPuntosInteres', () => {
  it('pide los puntos del viaje con la sesión y los devuelve', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { puntos_interes: [punto] }))
    vi.stubGlobal('fetch', fetchMock)

    const lista = await listarPuntosInteres(VIAJE_ID, 'token-acceso')

    expect(lista.puntos_interes).toEqual([punto])
    const [url, init] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/puntos-de-interes$`))
    expect(init.headers.Authorization).toBe('Bearer token-acceso')
  })

  it('lanza el error del servidor con su mensaje y su estado', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } })))

    const fallo = await listarPuntosInteres(VIAJE_ID, 't').catch((e) => e)

    expect(fallo).toBeInstanceOf(ApiError)
    expect(fallo.estado).toBe(404)
    expect(fallo.message).toBe('El viaje no existe o no perteneces a él')
  })
})

describe('puntosInteresApi · crearPuntoInteres', () => {
  it('envía el punto por POST con su dirección y devuelve el creado', async () => {
    const fetchMock = vi.fn(() => respuesta(201, punto))
    vi.stubGlobal('fetch', fetchMock)
    const nuevo = {
      nombre: 'Fontana di Trevi',
      nota: null,
      categoria: 'cultura' as const,
      latitud: 41.900932,
      longitud: 12.483313,
      lugar_externo_id: 'way/24146600',
      direccion: 'Fontana di Trevi, Piazza di Trevi, Roma',
    }

    const creado = await crearPuntoInteres(VIAJE_ID, nuevo, 'token-acceso')

    expect(creado).toEqual(punto)
    const [url, init] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/puntos-de-interes$`))
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual(nuevo)
    expect(init.headers.Authorization).toBe('Bearer token-acceso')
  })

})

describe('puntosInteresApi · eliminarPuntoInteres', () => {
  it('borra el punto por DELETE y no devuelve nada', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await eliminarPuntoInteres(VIAJE_ID, 'p1', 'token-acceso')

    expect(resultado).toBeNull()
    const [url, init] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/puntos-de-interes/p1$`))
    expect(init.method).toBe('DELETE')
  })

})
