import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import {
  buscarDirecciones,
  CATEGORIAS,
  crearActividad,
  editarActividad,
  iconoDeCategoria,
  listarActividades,
} from '../src/services/actividadesApi'

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
      hora_fin: '12:00',
      ubicacion_nombre: 'Piazza del Colosseo',
      categoria: 'cultura' as const,
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
        respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está finalizado y ya no se puede modificar' } }),
      ),
    )

    const error = await crearActividad(
      VIAJE_ID,
      { titulo: 'Cena', fecha: '2027-05-12', hora_inicio: null, hora_fin: null, ubicacion_nombre: null, categoria: null },
      'token-acceso',
    ).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.estado).toBe(409)
    expect(error.codigo).toBe('viaje_no_activo')
    expect(error.message).toBe('El viaje está finalizado y ya no se puede modificar')
  })
})

describe('actividadesApi · listar actividades', () => {
  it('pide todas las actividades del viaje con GET', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { actividades: [{ id: 'a1' }, { id: 'a2' }] }))
    vi.stubGlobal('fetch', fetchMock)

    const lista = await listarActividades(VIAJE_ID, 'token-acceso')

    expect(lista.actividades).toHaveLength(2)
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/actividades$`))
    expect(opciones.method ?? 'GET').toBe('GET')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
  })

  it('añade la fecha a la consulta para pedir un solo día', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { actividades: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await listarActividades(VIAJE_ID, 'token-acceso', '2027-05-12')

    expect(llamada(fetchMock)[0]).toMatch(new RegExp(`/viajes/${VIAJE_ID}/actividades\\?fecha=2027-05-12$`))
  })

})

describe('actividadesApi · categorías', () => {
  it('tiene un icono distinto para cada tipo y el pin como icono por defecto', () => {
    expect(CATEGORIAS.map((categoria) => categoria.valor)).toEqual(['comida', 'cultura', 'transporte', 'alojamiento', 'otro'])
    expect(iconoDeCategoria('comida')).toBe('restaurant')
    expect(iconoDeCategoria('transporte')).toBe('car')
    expect(iconoDeCategoria(null)).toBe('pin')
    expect(iconoDeCategoria('desconocida')).toBe('pin')
  })
})

describe('actividadesApi · editar y eliminar actividad', () => {
  const ACTIVIDAD_ID = '8a1b2c3d-0000-4000-8000-000000000020'

  it('modifica la actividad con PATCH enviando solo los cambios', async () => {
    const fetchMock = vi.fn(() => respuesta(200, { id: ACTIVIDAD_ID, titulo: 'Coliseo y Foro' }))
    vi.stubGlobal('fetch', fetchMock)

    const actividad = await editarActividad(VIAJE_ID, ACTIVIDAD_ID, { titulo: 'Coliseo y Foro', hora_fin: null }, 'token-acceso')

    expect(actividad.titulo).toBe('Coliseo y Foro')
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/actividades/${ACTIVIDAD_ID}$`))
    expect(opciones.method).toBe('PATCH')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(JSON.parse(opciones.body as string)).toEqual({ titulo: 'Coliseo y Foro', hora_fin: null })
  })


})

describe('actividadesApi · buscar direcciones', () => {
  it('pide GET /direcciones con el texto codificado y el token, y devuelve las direcciones', async () => {
    const colosseo = { nombre: 'Colosseo, Roma', latitud: 41.890214, longitud: 12.492231, lugar_externo_id: 'way/1' }
    const fetchMock = vi.fn(() => respuesta(200, { direcciones: [colosseo] }))
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await buscarDirecciones('Colosseo, Roma & Foro', 'token-acceso')

    expect(resultado.direcciones).toEqual([colosseo])
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(/\/direcciones\?q=Colosseo%2C%20Roma%20%26%20Foro$/)
    expect(opciones.method ?? 'GET').toBe('GET')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
  })

  it('devuelve una lista vacía si no hay resultados', async () => {
    vi.stubGlobal('fetch', vi.fn(() => respuesta(200, { direcciones: [] })))

    const resultado = await buscarDirecciones('Lugar inexistente', 'token-acceso')

    expect(resultado.direcciones).toEqual([])
  })

})
