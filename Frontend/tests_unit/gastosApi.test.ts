// Test unitario de la función crearGasto de gastosApi.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import { crearGasto, type NuevoGasto } from '../src/services/gastosApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ADRIANA = 'df77cba6-4be5-4cbc-814b-1e228dd73dcc'
const BERTA = '5b1f0c2e-8a7d-4c3b-9e6f-2d4a1b3c5e7f'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }),
  )

const llamada = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }]

const NUEVO: NuevoGasto = {
  concepto: 'Cena',
  importe: 10,
  categoria: 'comida',
  pagado_por: ADRIANA,
  participantes: [ADRIANA, BERTA],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('gastosApi · crear gasto', () => {
  it('registra el gasto con POST a /viajes/:id/gastos y devuelve el gasto con su reparto', async () => {
    const gasto = {
      id: 'g1',
      concepto: 'Cena',
      importe: 10,
      repartos: [
        { usuario_id: ADRIANA, importe: 5 },
        { usuario_id: BERTA, importe: 5 },
      ],
    }
    const fetchMock = vi.fn(() => respuesta(201, gasto))
    vi.stubGlobal('fetch', fetchMock)

    const creado = await crearGasto(VIAJE_ID, NUEVO, 'token-acceso')

    expect(creado).toEqual(gasto)
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/gastos$`))
    expect(opciones.method).toBe('POST')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(opciones.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(opciones.body as string)).toEqual(NUEVO)
  })

  it('codifica el identificador del viaje en la URL', async () => {
    const fetchMock = vi.fn(() => respuesta(201, {}))
    vi.stubGlobal('fetch', fetchMock)

    await crearGasto('viaje con/espacios', NUEVO, 'token-acceso')

    expect(llamada(fetchMock)[0]).toMatch(/\/viajes\/viaje%20con%2Fespacios\/gastos$/)
  })

  it('propaga los rechazos del backend como ApiError con su código y mensaje', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        respuesta(400, {
          error: { codigo: 'datos_invalidos', mensaje: 'Quien paga y los participantes tienen que ser miembros del viaje' },
        }),
      ),
    )

    const error = await crearGasto(VIAJE_ID, NUEVO, 'token-acceso').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).estado).toBe(400)
    expect((error as ApiError).codigo).toBe('datos_invalidos')
    expect((error as ApiError).message).toBe('Quien paga y los participantes tienen que ser miembros del viaje')
  })

  it('avisa de que no hay conexión si el servidor no responde', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

    const error = await crearGasto(VIAJE_ID, NUEVO, 'token-acceso').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).codigo).toBe('sin_conexion')
  })
})
