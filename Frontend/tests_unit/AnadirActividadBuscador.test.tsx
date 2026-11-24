import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnadirActividad from '../src/screens/AnadirActividad'
import { ApiError } from '../src/services/authApi'
import type { ResultadoDireccion } from '../src/services/actividadesApi'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const COLISEO: ResultadoDireccion = {
  nombre: 'Colosseo, Roma',
  titulo: 'Colosseo',
  detalle: 'Roma, Italia',
  latitud: 41.890214,
  longitud: 12.492231,
  lugar_externo_id: 'way/24146600',
}
const FORO: ResultadoDireccion = {
  nombre: 'Foro Romano, Roma',
  titulo: 'Foro Romano',
  detalle: 'Roma, Italia',
  latitud: 41.892462,
  longitud: 12.485325,
  lugar_externo_id: 'relation/5',
}

const etiqueta = (direccion: ResultadoDireccion) => `${direccion.titulo}, ${direccion.detalle}`

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


const campoLugar = () => screen.getByLabelText('Lugar / Dirección') as HTMLInputElement
const lupa = () => screen.getByRole('button', { name: 'Buscar dirección' })
const botonAnadir = () => screen.getByRole('button', { name: /Añadir al itinerario|Guardando/ })
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
    expect(within(elementos[0]).getByText('Colosseo').textContent).toBe('Colosseo')
    expect(within(elementos[0]).getByText('Roma, Italia')).toBeTruthy()
    expect(within(elementos[1]).getByText('Foro Romano')).toBeTruthy()
    expect(elementos[0].textContent).not.toContain('Piazza')
  });

  it('un resultado sin detalle muestra solo el título', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizarNueva(vi.fn(() => Promise.resolve([{ ...COLISEO, detalle: null }])))

    await esperarFormulario()
    await user.type(campoLugar(), 'Colosseo')
    await user.click(lupa())

    const elemento = within(await screen.findByRole('list', { name: 'Resultados de la búsqueda' })).getByRole('listitem')
    expect(elemento.textContent).toBe('Colosseo')
    expect(within(elemento).getByRole('button', { name: 'Colosseo' })).toBeTruthy()
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


  it('al elegir un resultado rellena el lugar, lo marca como localizado y cierra la lista', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizarNueva(vi.fn(() => Promise.resolve([COLISEO, FORO])))

    await esperarFormulario()
    await user.type(campoLugar(), 'Roma')
    await user.click(lupa())
    await user.click(await screen.findByRole('button', { name: etiqueta(FORO) }))

    expect(campoLugar().value).toBe(FORO.nombre)
    expect(screen.getByText('Ubicación localizada en el mapa')).toBeTruthy()
    expect(screen.queryByRole('list', { name: 'Resultados de la búsqueda' })).toBeNull()
  })





})

