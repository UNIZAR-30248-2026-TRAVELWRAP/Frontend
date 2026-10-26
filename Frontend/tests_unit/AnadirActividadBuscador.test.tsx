import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnadirActividad from '../src/screens/AnadirActividad'
import { ApiError } from '../src/services/authApi'
import type { ResultadoDireccion } from '../src/services/actividadesApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'
const ACTIVIDAD_ID = '8a1b2c3d-0000-4000-8000-000000000020'

const COLISEO: ResultadoDireccion = {
  nombre: 'Colosseo, Piazza del Colosseo, Roma, Lazio, Italia',
  latitud: 41.890214,
  longitud: 12.492231,
  lugar_externo_id: 'way/24146600',
}
const FORO: ResultadoDireccion = {
  nombre: 'Foro Romano, Via della Salara Vecchia, Roma, Lazio, Italia',
  latitud: 41.892462,
  longitud: 12.485325,
  lugar_externo_id: 'relation/5',
}

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }),
  )

const viaje = {
  id: VIAJE_ID,
  nombre: 'Roma 2027',
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-14',
  moneda: 'EUR',
  presupuesto: 850,
  estado: 'activo',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  rol: 'miembro',
  miembros: [{ usuario_id: 'u1', nombre: 'Adriana', avatar_url: null, rol: 'creador' }],
}

const actividad = (datos: Record<string, unknown> = {}) => ({
  id: ACTIVIDAD_ID,
  viaje_id: VIAJE_ID,
  titulo: 'Visita al Coliseo',
  descripcion: null,
  fecha: '2027-05-12',
  hora_inicio: null,
  hora_fin: null,
  orden: 0,
  ubicacion_nombre: COLISEO.nombre,
  latitud: COLISEO.latitud,
  longitud: COLISEO.longitud,
  lugar_externo_id: COLISEO.lugar_externo_id,
  categoria: null,
  creado_por: 'u1',
  creado_en: '2026-10-24T10:00:00Z',
  actualizado_en: '2026-10-24T10:00:00Z',
  ...datos,
})

const simularBackend = (actividades: unknown[] = []) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'POST' || opciones?.method === 'PATCH') return respuesta(200, { id: 'a1' })
    return url.includes('/actividades') ? respuesta(200, { actividades }) : respuesta(200, viaje)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const cuerpoEnviado = (fetchMock: ReturnType<typeof vi.fn>, metodo: string) => {
  const llamada = fetchMock.mock.calls.find(([, opciones]) => (opciones as RequestInit)?.method === metodo)
  return llamada ? JSON.parse((llamada[1] as RequestInit).body as string) : undefined
}

const renderizarNueva = (buscar?: (consulta: string) => Promise<ResultadoDireccion[]>) =>
  render(<AnadirActividad viajeId={VIAJE_ID} tokenSesion="token-acceso" onBuscarDirecciones={buscar} />)

const renderizarEdicion = (buscar?: (consulta: string) => Promise<ResultadoDireccion[]>) =>
  render(
    <AnadirActividad
      viajeId={VIAJE_ID}
      actividadId={ACTIVIDAD_ID}
      tokenSesion="token-acceso"
      onBuscarDirecciones={buscar}
    />,
  )

const campoLugar = () => screen.getByLabelText('Lugar / Dirección') as HTMLInputElement
const lupa = () => screen.getByRole('button', { name: 'Buscar dirección' })
const botonAnadir = () => screen.getByRole('button', { name: /Añadir al itinerario|Guardando/ })
const botonGuardar = () => screen.getByRole('button', { name: /Guardar cambios|Guardando/ })
const esperarFormulario = () => screen.findByLabelText('Nombre de la actividad')

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AnadirActividad · buscador de direcciones', () => {
  it('sin función de búsqueda no muestra la lupa', async () => {
    simularBackend()
    renderizarNueva()

    await esperarFormulario()

    expect(screen.queryByRole('button', { name: 'Buscar dirección' })).toBeNull()
  })

  it('la lupa solo se activa con tres caracteres o más', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizarNueva(vi.fn())

    await esperarFormulario()
    expect(lupa()).toHaveProperty('disabled', true)
    await user.type(campoLugar(), 'Ro')
    expect(lupa()).toHaveProperty('disabled', true)
    await user.type(campoLugar(), 'm')
    expect(lupa()).toHaveProperty('disabled', false)
    await user.clear(campoLugar())
    await user.type(campoLugar(), '   ab  ')
    expect(lupa()).toHaveProperty('disabled', true)
  })

  it('no busca al teclear, solo al pulsar la lupa, y envía el texto sin espacios sobrantes', async () => {
    const user = userEvent.setup()
    const buscar = vi.fn(() => Promise.resolve([COLISEO]))
    simularBackend()
    renderizarNueva(buscar)

    await esperarFormulario()
    await user.type(campoLugar(), '  Colosseo, Roma ')
    expect(buscar).not.toHaveBeenCalled()
    await user.click(lupa())

    await waitFor(() => expect(buscar).toHaveBeenCalledTimes(1))
    expect(buscar).toHaveBeenCalledWith('Colosseo, Roma')
  })

  it('con Enter busca sin guardar la actividad', async () => {
    const user = userEvent.setup()
    const buscar = vi.fn(() => Promise.resolve([COLISEO]))
    const fetchMock = simularBackend()
    renderizarNueva(buscar)

    await user.type(await esperarFormulario(), 'Coliseo')
    await user.type(campoLugar(), 'Colosseo{Enter}')

    await waitFor(() => expect(buscar).toHaveBeenCalledWith('Colosseo'))
    expect(cuerpoEnviado(fetchMock, 'POST')).toBeUndefined()
  })

  it('con Enter y menos de tres caracteres no busca', async () => {
    const user = userEvent.setup()
    const buscar = vi.fn(() => Promise.resolve([]))
    simularBackend()
    renderizarNueva(buscar)

    await esperarFormulario()
    await user.type(campoLugar(), 'Ro{Enter}')

    expect(buscar).not.toHaveBeenCalled()
  })

  it('muestra «Buscando...» mientras espera y bloquea la lupa', async () => {
    const user = userEvent.setup()
    let terminar: (resultados: ResultadoDireccion[]) => void = () => {}
    const buscar = vi.fn(() => new Promise<ResultadoDireccion[]>((resolver) => (terminar = resolver)))
    simularBackend()
    renderizarNueva(buscar)

    await esperarFormulario()
    await user.type(campoLugar(), 'Colosseo')
    await user.click(lupa())

    expect(await screen.findByText('Buscando...')).toBeTruthy()
    expect(lupa()).toHaveProperty('disabled', true)
    terminar([COLISEO])
    await screen.findByRole('list', { name: 'Resultados de la búsqueda' })
    expect(screen.queryByText('Buscando...')).toBeNull()
    expect(lupa()).toHaveProperty('disabled', false)
  })

  it('lista los resultados de la búsqueda', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizarNueva(vi.fn(() => Promise.resolve([COLISEO, FORO])))

    await esperarFormulario()
    await user.type(campoLugar(), 'Roma')
    await user.click(lupa())

    const lista = await screen.findByRole('list', { name: 'Resultados de la búsqueda' })
    const elementos = within(lista).getAllByRole('listitem')
    expect(elementos).toHaveLength(2)
    expect(elementos[0].textContent).toBe(COLISEO.nombre)
    expect(elementos[1].textContent).toBe(FORO.nombre)
  })

  it('si no hay resultados lo dice y deja guardar el lugar como texto', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizarNueva(vi.fn(() => Promise.resolve([])))

    await user.type(await esperarFormulario(), 'Cena')
    await user.type(campoLugar(), 'Trattoria sin nombre')
    await user.click(lupa())

    expect(await screen.findByText(/No se han encontrado resultados/)).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Resultados de la búsqueda' })).toBeNull()
    await user.click(botonAnadir())

    await waitFor(() => expect(cuerpoEnviado(fetchMock, 'POST')).toBeDefined())
    expect(cuerpoEnviado(fetchMock, 'POST')).toMatchObject({
      ubicacion_nombre: 'Trattoria sin nombre',
      latitud: null,
      longitud: null,
      lugar_externo_id: null,
    })
  })

  it('si la búsqueda falla muestra el mensaje del servidor y el formulario sigue funcionando', async () => {
    const user = userEvent.setup()
    const buscar = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(429, 'demasiadas_busquedas', 'Espera un segundo entre una búsqueda y otra'))
      .mockResolvedValueOnce([COLISEO])
    simularBackend()
    renderizarNueva(buscar)

    await esperarFormulario()
    await user.type(campoLugar(), 'Colosseo')
    await user.click(lupa())

    expect((await screen.findByRole('alert')).textContent).toBe('Espera un segundo entre una búsqueda y otra')
    await user.click(lupa())
    await screen.findByRole('list', { name: 'Resultados de la búsqueda' })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('si la búsqueda falla sin ser un error del servidor muestra un mensaje genérico', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizarNueva(vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

    await esperarFormulario()
    await user.type(campoLugar(), 'Colosseo')
    await user.click(lupa())

    expect((await screen.findByRole('alert')).textContent).toBe('Ha ocurrido un error')
  })

  it('al elegir un resultado rellena el lugar, lo marca como localizado y cierra la lista', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizarNueva(vi.fn(() => Promise.resolve([COLISEO, FORO])))

    await esperarFormulario()
    await user.type(campoLugar(), 'Roma')
    await user.click(lupa())
    await user.click(await screen.findByRole('button', { name: FORO.nombre }))

    expect(campoLugar().value).toBe(FORO.nombre)
    expect(screen.getByText('Ubicación localizada en el mapa')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Resultados de la búsqueda' })).toBeNull()
  })

  it('al guardar envía las coordenadas y el identificador del lugar elegido', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizarNueva(vi.fn(() => Promise.resolve([COLISEO])))

    await user.type(await esperarFormulario(), 'Visita al Coliseo')
    await user.type(campoLugar(), 'Colosseo')
    await user.click(lupa())
    await user.click(await screen.findByRole('button', { name: COLISEO.nombre }))
    await user.click(botonAnadir())

    await waitFor(() => expect(cuerpoEnviado(fetchMock, 'POST')).toBeDefined())
    expect(cuerpoEnviado(fetchMock, 'POST')).toMatchObject({
      ubicacion_nombre: COLISEO.nombre,
      latitud: 41.890214,
      longitud: 12.492231,
      lugar_externo_id: 'way/24146600',
    })
  })

  it('«Quitar» borra las coordenadas pero deja el texto del lugar', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizarNueva(vi.fn(() => Promise.resolve([COLISEO])))

    await user.type(await esperarFormulario(), 'Visita al Coliseo')
    await user.type(campoLugar(), 'Colosseo')
    await user.click(lupa())
    await user.click(await screen.findByRole('button', { name: COLISEO.nombre }))
    await user.click(screen.getByRole('button', { name: 'Quitar' }))

    expect(screen.queryByText('Ubicación localizada en el mapa')).toBeNull()
    expect(campoLugar().value).toBe(COLISEO.nombre)
    await user.click(botonAnadir())
    await waitFor(() => expect(cuerpoEnviado(fetchMock, 'POST')).toBeDefined())
    expect(cuerpoEnviado(fetchMock, 'POST')).toMatchObject({
      ubicacion_nombre: COLISEO.nombre,
      latitud: null,
      longitud: null,
      lugar_externo_id: null,
    })
  })

  it('si se edita el texto después de elegir, se pierden las coordenadas', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizarNueva(vi.fn(() => Promise.resolve([COLISEO])))

    await user.type(await esperarFormulario(), 'Visita al Coliseo')
    await user.type(campoLugar(), 'Colosseo')
    await user.click(lupa())
    await user.click(await screen.findByRole('button', { name: COLISEO.nombre }))
    await user.type(campoLugar(), ' (entrada norte)')

    expect(screen.queryByText('Ubicación localizada en el mapa')).toBeNull()
    await user.click(botonAnadir())
    await waitFor(() => expect(cuerpoEnviado(fetchMock, 'POST')).toBeDefined())
    expect(cuerpoEnviado(fetchMock, 'POST')).toMatchObject({
      ubicacion_nombre: `${COLISEO.nombre} (entrada norte)`,
      latitud: null,
      longitud: null,
    })
  })

  it('si se edita el texto con la lista abierta, la lista desaparece', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizarNueva(vi.fn(() => Promise.resolve([COLISEO])))

    await esperarFormulario()
    await user.type(campoLugar(), 'Colosseo')
    await user.click(lupa())
    await screen.findByRole('list', { name: 'Resultados de la búsqueda' })
    await user.type(campoLugar(), 'x')

    expect(screen.queryByRole('list', { name: 'Resultados de la búsqueda' })).toBeNull()
  })

  it('una nueva búsqueda descarta el lugar elegido antes', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizarNueva(vi.fn(() => Promise.resolve([COLISEO])))

    await esperarFormulario()
    await user.type(campoLugar(), 'Colosseo')
    await user.click(lupa())
    await user.click(await screen.findByRole('button', { name: COLISEO.nombre }))
    expect(screen.getByText('Ubicación localizada en el mapa')).toBeTruthy()
    await user.click(lupa())

    await screen.findByRole('list', { name: 'Resultados de la búsqueda' })
    expect(screen.queryByText('Ubicación localizada en el mapa')).toBeNull()
  })
})

describe('AnadirActividad · buscador de direcciones en modo edición', () => {
  it('al editar una actividad con coordenadas las muestra como localizadas y no las reenvía si no cambian', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend([actividad()])
    renderizarEdicion(vi.fn())

    await user.type(await esperarFormulario(), ' y Foro')

    expect(screen.getByText('Ubicación localizada en el mapa')).toBeTruthy()
    await user.click(botonGuardar())
    await waitFor(() => expect(cuerpoEnviado(fetchMock, 'PATCH')).toBeDefined())
    expect(cuerpoEnviado(fetchMock, 'PATCH')).toEqual({ titulo: 'Visita al Coliseo y Foro' })
  })

  it('al quitar las coordenadas de una actividad envía las tres a null', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend([actividad()])
    renderizarEdicion(vi.fn())

    await esperarFormulario()
    expect(botonGuardar()).toHaveProperty('disabled', true)
    await user.click(screen.getByRole('button', { name: 'Quitar' }))
    expect(botonGuardar()).toHaveProperty('disabled', false)
    await user.click(botonGuardar())

    await waitFor(() => expect(cuerpoEnviado(fetchMock, 'PATCH')).toBeDefined())
    expect(cuerpoEnviado(fetchMock, 'PATCH')).toEqual({ latitud: null, longitud: null, lugar_externo_id: null })
  })

  it('al elegir otro lugar envía el nombre y las coordenadas nuevas', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend([actividad()])
    renderizarEdicion(vi.fn(() => Promise.resolve([FORO])))

    await esperarFormulario()
    await user.clear(campoLugar())
    await user.type(campoLugar(), 'Foro Romano')
    await user.click(lupa())
    await user.click(await screen.findByRole('button', { name: FORO.nombre }))
    await user.click(botonGuardar())

    await waitFor(() => expect(cuerpoEnviado(fetchMock, 'PATCH')).toBeDefined())
    expect(cuerpoEnviado(fetchMock, 'PATCH')).toEqual({
      ubicacion_nombre: FORO.nombre,
      latitud: 41.892462,
      longitud: 12.485325,
      lugar_externo_id: 'relation/5',
    })
  })

  it('una actividad sin coordenadas no aparece como localizada', async () => {
    simularBackend([actividad({ latitud: null, longitud: null, lugar_externo_id: null })])
    renderizarEdicion(vi.fn())

    await esperarFormulario()

    expect(screen.queryByText('Ubicación localizada en el mapa')).toBeNull()
  })
})
