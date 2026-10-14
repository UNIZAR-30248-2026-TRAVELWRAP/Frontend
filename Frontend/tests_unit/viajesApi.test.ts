import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import { crearViaje, listarViajes, obtenerViaje } from '../src/services/viajesApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

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

describe('viajesApi', () => {
  it('lista los viajes con el token de sesión y permite filtrar por estado', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { viajes: [] }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await listarViajes('token-acceso')).toEqual({ viajes: [] })
    await listarViajes('token-acceso', 'finalizado')

    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(/\/viajes$/)
    expect(opciones.method).toBe('GET')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/viajes\?estado=finalizado$/)
  })

  it('obtiene el detalle de un viaje', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { id: VIAJE_ID }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await obtenerViaje(VIAJE_ID, 'token-acceso')).toEqual({ id: VIAJE_ID })
    expect(llamada(fetchMock)[0]).toMatch(new RegExp(`/viajes/${VIAJE_ID}$`))
  })

  it('crea un viaje enviando sus datos por POST', async () => {
    const fetchMock = vi.fn(() => respuesta(201, { id: VIAJE_ID, nombre: 'Roma 2027' }))
    vi.stubGlobal('fetch', fetchMock)
    const nuevo = { nombre: 'Roma 2027', presupuesto: 850, destino: 'Roma', fecha_inicio: null, fecha_fin: null }

    const viaje = await crearViaje(nuevo, 'token-acceso')

    expect(viaje.id).toBe(VIAJE_ID)
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(/\/viajes$/)
    expect(opciones.method).toBe('POST')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(JSON.parse(opciones.body as string)).toEqual(nuevo)
  })

  it('propaga el error del backend como ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(400, { error: { codigo: 'datos_invalidos', mensaje: 'La fecha de fin no puede ser anterior a la de inicio' } }),
    ))

    const error = await crearViaje(
      { nombre: 'X', presupuesto: 1, destino: 'Roma', fecha_inicio: '2027-05-15', fecha_fin: '2027-05-12' },
      'token-acceso',
    ).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.codigo).toBe('datos_invalidos')
  })
})
