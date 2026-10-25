import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../src/services/authApi'
import {
  CATEGORIAS,
  crearActividad,
  editarActividad,
  eliminarActividad,
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
        respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' } }),
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
    expect(error.message).toBe('El viaje está cerrado y ya no se puede modificar')
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

  it('propaga los rechazos del backend como ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        respuesta(404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } }),
      ),
    )

    const error = await listarActividades(VIAJE_ID, 'token-acceso').catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.estado).toBe(404)
    expect(error.codigo).toBe('viaje_no_encontrado')
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

  it('elimina la actividad con DELETE y devuelve null si el servidor responde 204', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })))
    vi.stubGlobal('fetch', fetchMock)

    const resultado = await eliminarActividad(VIAJE_ID, ACTIVIDAD_ID, 'token-acceso')

    expect(resultado).toBeNull()
    const [url, opciones] = llamada(fetchMock)
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/actividades/${ACTIVIDAD_ID}$`))
    expect(opciones.method).toBe('DELETE')
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(opciones.body).toBeUndefined()
  })

  it('propaga los rechazos del backend como ApiError en ambos casos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        respuesta(404, { error: { codigo: 'actividad_no_encontrada', mensaje: 'La actividad no existe en este viaje' } }),
      ),
    )

    const alEditar = await editarActividad(VIAJE_ID, ACTIVIDAD_ID, { titulo: 'X' }, 'token-acceso').catch((e) => e)
    const alEliminar = await eliminarActividad(VIAJE_ID, ACTIVIDAD_ID, 'token-acceso').catch((e) => e)

    for (const error of [alEditar, alEliminar]) {
      expect(error).toBeInstanceOf(ApiError)
      expect(error.estado).toBe(404)
      expect(error.codigo).toBe('actividad_no_encontrada')
    }
  })
})

