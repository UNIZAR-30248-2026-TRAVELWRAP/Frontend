import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import { crearActividad } from '../src/services/actividadesApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }),
  )

const llamada = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('actividadesApi · crear actividad', () => {
  it('crea la actividad con POST a /viajes/:id/actividades y devuelve la actividad', async () => {
    const fetchMock = vi.fn(() => respuesta(201, { id: 'a1', titulo: 'Visita al Coliseo', orden: 0 }))
    vi.stubGlobal('fetch', fetchMock)
    const nueva = {
      titulo: 'Visita al Coliseo',
      fecha: '2027-05-12',
      hora_inicio: '10:00',
      ubicacion_nombre: 'Piazza del Colosseo',
    }

    const actividad = await crearActividad(VIAJE_ID, nueva, 'token-acceso')

    expect(actividad.id).toBe('a1')
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/actividades$`))
    expect(opciones.method).toBe('POST')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(JSON.parse(opciones.body as string)).toEqual(nueva)
  })

  it('propaga los rechazos del backend como ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' } }),
      ),
    )

    const error = await crearActividad(
      VIAJE_ID,
      { titulo: 'Cena', fecha: '2027-05-12', hora_inicio: null, ubicacion_nombre: null },
      'token-acceso',
    ).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.estado).toBe(409)
    expect(error.codigo).toBe('viaje_no_activo')
    expect(error.message).toBe('El viaje está cerrado y ya no se puede modificar')
  })
})
