import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import { archivarViaje, editarViaje, eliminarViaje } from '../src/services/viajesApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo?: unknown) =>
  Promise.resolve(
    cuerpo === undefined
      ? new Response(null, { status: estado })
      : new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }),
  )

const llamada = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('viajesApi · editar, archivar y eliminar', () => {
  it('edita el viaje enviando solo los cambios por PATCH', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { id: VIAJE_ID, nombre: 'Roma 2028' }))
    vi.stubGlobal('fetch', fetchMock)

    const viaje = await editarViaje(VIAJE_ID, { nombre: 'Roma 2028', fecha_fin: null }, 'token-acceso')

    expect(viaje.nombre).toBe('Roma 2028')
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}$`))
    expect(opciones.method).toBe('PATCH')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(JSON.parse(opciones.body as string)).toEqual({ nombre: 'Roma 2028', fecha_fin: null })
  })

  it('archiva el viaje con POST a /archivar', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { id: VIAJE_ID, estado: 'archivado' }))
    vi.stubGlobal('fetch', fetchMock)

    const viaje = await archivarViaje(VIAJE_ID, 'token-acceso')

    expect(viaje.estado).toBe('archivado')
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/archivar$`))
    expect(opciones.method).toBe('POST')
    expect(opciones.body).toBeUndefined()
  })

  it('elimina el viaje con DELETE y acepta la respuesta 204 sin cuerpo', async () => {
    const fetchMock = vi.fn(() => respuesta(204))
    vi.stubGlobal('fetch', fetchMock)

    expect(await eliminarViaje(VIAJE_ID, 'token-acceso')).toBeNull()
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}$`))
    expect(opciones.method).toBe('DELETE')
  })

  it('propaga los rechazos del backend como ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      respuesta(409, { error: { codigo: 'viaje_no_archivado', mensaje: 'Solo se pueden eliminar viajes archivados' } }),
    ))

    const error = await eliminarViaje(VIAJE_ID, 'token-acceso').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.estado).toBe(409)
    expect(error.codigo).toBe('viaje_no_archivado')
    expect(error.message).toBe('Solo se pueden eliminar viajes archivados')
  })
})
