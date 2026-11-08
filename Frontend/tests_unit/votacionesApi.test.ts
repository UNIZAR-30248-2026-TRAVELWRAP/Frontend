import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import { cerrarVotacion, crearVotacion, listarVotaciones, proponerOpcion, retirarVoto, votar } from '../src/services/votacionesApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const VOTACION_ID = '6f1c2d3e-0000-4000-8000-000000000010'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

const simular = (estado = 200, cuerpo: unknown = {}) => {
  const fetchMock = vi.fn(() => respuesta(estado, cuerpo))
  vi.stubGlobal('fetch', fetchMock)
  return () => fetchMock.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }]
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('votacionesApi', () => {
  it('lista las votaciones del viaje con los filtros en la consulta', async () => {
    const llamada = simular(200, { votaciones: [] })

    await listarVotaciones(VIAJE_ID, 'token-acceso', { tipo: 'destino' })

    const [url, opciones] = llamada()
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/votaciones\\?tipo=destino$`))
    expect(opciones.method).toBe('GET')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
  })

  it('sin filtros no añade consulta', async () => {
    const llamada = simular(200, { votaciones: [] })
    await listarVotaciones(VIAJE_ID, 'token-acceso')
    expect(llamada()[0]).toMatch(/\/votaciones$/)
  })

  it('crea una votación con POST y sus opciones', async () => {
    const llamada = simular(201, { id: VOTACION_ID })
    const nueva = { titulo: '¿Qué día?', tipo: 'fecha' as const, opciones: [{ texto: 'Viernes' }, { texto: 'Sábado' }] }

    await crearVotacion(VIAJE_ID, nueva, 'token-acceso')

    const [url, opciones] = llamada()
    expect(url).toMatch(/\/votaciones$/)
    expect(opciones.method).toBe('POST')
    expect(JSON.parse(opciones.body as string)).toEqual(nueva)
  })

  it('propone una opción con POST a /opciones', async () => {
    const llamada = simular(201, { id: VOTACION_ID })
    await proponerOpcion(VIAJE_ID, VOTACION_ID, { texto: 'Lisboa' }, 'token-acceso')
    const [url, opciones] = llamada()
    expect(url).toMatch(new RegExp(`/votaciones/${VOTACION_ID}/opciones$`))
    expect(JSON.parse(opciones.body as string)).toEqual({ texto: 'Lisboa' })
  })

  it('vota con PUT a /voto y retira el voto con DELETE', async () => {
    const llamadaVoto = simular(200, { id: VOTACION_ID })
    await votar(VIAJE_ID, VOTACION_ID, 'opcion-1', 'token-acceso')
    expect(llamadaVoto()[0]).toMatch(new RegExp(`/votaciones/${VOTACION_ID}/voto$`))
    expect(llamadaVoto()[1].method).toBe('PUT')
    expect(JSON.parse(llamadaVoto()[1].body as string)).toEqual({ opcion_id: 'opcion-1' })

    vi.unstubAllGlobals()
    const llamadaRetirar = simular(200, { id: VOTACION_ID })
    await retirarVoto(VIAJE_ID, VOTACION_ID, 'token-acceso')
    expect(llamadaRetirar()[1].method).toBe('DELETE')
  })

  it('cierra con POST a /cerrar y devuelve el resultado del cierre', async () => {
    simular(200, { votacion: { id: VOTACION_ID }, hubo_empate: true, destino: 'Praga' })
    const resultado = await cerrarVotacion(VIAJE_ID, VOTACION_ID, 'token-acceso')
    expect(resultado).toMatchObject({ hubo_empate: true, destino: 'Praga' })
  })

  it('convierte los errores de la API en ApiError con su código', async () => {
    simular(409, { error: { codigo: 'sin_votos', mensaje: 'La votación de destino necesita al menos un voto para cerrarse' } })

    const fallo = await cerrarVotacion(VIAJE_ID, VOTACION_ID, 'token-acceso').catch((e) => e)

    expect(fallo).toBeInstanceOf(ApiError)
    expect(fallo.estado).toBe(409)
    expect(fallo.codigo).toBe('sin_votos')
  })
})
