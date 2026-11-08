import { afterEach, describe, expect, it, vi } from 'vitest'
import { obtenerRutaDelDia } from '../src/services/rutasApi'

const RUTA = {
  puntos: [{ id: 'a1', titulo: 'Coliseo', latitud: 41.89, longitud: 12.49 }],
  orden_sugerido: ['a1'],
  ahorro_m: 0,
  ruta: null,
}

const responder = (estado: number, cuerpo: unknown) =>
  vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })),
  )

afterEach(() => vi.unstubAllGlobals())

describe('obtenerRutaDelDia', () => {
  it('pide la ruta del día con la sesión y devuelve los datos', async () => {
    const fetchMock = responder(200, RUTA)
    vi.stubGlobal('fetch', fetchMock)

    const datos = await obtenerRutaDelDia('v 1', '2027-05-12', 'token-acceso')

    expect(datos).toEqual(RUTA)
    const [url, opciones] = fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toMatch(/\/viajes\/v%201\/ruta\?fecha=2027-05-12$/)
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
  })

  it('acepta una ruta con geometría', async () => {
    const conRuta = { ...RUTA, ruta: { distancia_m: 800, duracion_s: 600, geometria: [[41.89, 12.49], [41.9, 12.5]] } }
    vi.stubGlobal('fetch', responder(200, conRuta))

    expect((await obtenerRutaDelDia('v', '2027-05-12', 't')).ruta?.geometria).toHaveLength(2)
  })

  it('rechaza una respuesta que no tiene la forma esperada', async () => {
    vi.stubGlobal('fetch', responder(200, { id: 'roma', nombre: 'Roma 2027' }))

    await expect(obtenerRutaDelDia('v', '2027-05-12', 't')).rejects.toThrow('Respuesta de ruta no válida')
  })

  it('propaga el error del servidor con su mensaje', async () => {
    vi.stubGlobal('fetch', responder(502, { error: { codigo: 'error_ruta', mensaje: 'No se ha podido calcular la ruta' } }))

    await expect(obtenerRutaDelDia('v', '2027-05-12', 't')).rejects.toThrow('No se ha podido calcular la ruta')
  })
})
