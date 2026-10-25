import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AnadirActividad from '../src/screens/AnadirActividad'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }),
  )

const viaje = (datos: Record<string, unknown> = {}) => ({
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
  ...datos,
})

const simularBackend = (datos: Record<string, unknown> = {}, post = () => respuesta(201, { id: 'a1' })) => {
  const fetchMock = vi.fn((_url: string, opciones?: RequestInit) =>
    opciones?.method === 'POST' ? post() : respuesta(200, viaje(datos)),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const renderizar = (props: Partial<Parameters<typeof AnadirActividad>[0]> = {}) =>
  render(<AnadirActividad viajeId={VIAJE_ID} tokenSesion="token-acceso" {...props} />)

const botonAnadir = () => screen.getByRole('button', { name: /Añadir al itinerario|Guardando/ })

const cuerpoDelPost = (fetchMock: ReturnType<typeof vi.fn>) => {
  const llamada = fetchMock.mock.calls.find(([, opciones]) => (opciones as RequestInit)?.method === 'POST')
  return llamada ? JSON.parse((llamada[1] as RequestInit).body as string) : undefined
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('AnadirActividad', () => {
  it('muestra el nombre del viaje y una pastilla por cada día', async () => {
    simularBackend()
    renderizar()

    expect(await screen.findByText(/Itinerario · Roma 2027/)).toBeTruthy()
    const dias = screen.getByRole('group', { name: 'Día de la actividad' })
    expect(dias.textContent).toContain('Día 1 · 12 may')
    expect(dias.textContent).toContain('Día 2 · 13 may')
    expect(dias.textContent).toContain('Día 3 · 14 may')
    expect(screen.getByRole('button', { name: 'Día 1 · 12 may' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByLabelText('Fecha')).toBeNull()
  })

  it('pide la fecha con un campo si el viaje no tiene fechas', async () => {
    simularBackend({ fecha_inicio: null, fecha_fin: null })
    renderizar()

    expect(await screen.findByLabelText('Fecha')).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Día de la actividad' })).toBeNull()
  })

  it('no deja añadir sin título y sí con título', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizar()

    await screen.findByLabelText('Nombre de la actividad')
    expect(botonAnadir()).toHaveProperty('disabled', true)
    await user.type(screen.getByLabelText('Nombre de la actividad'), 'Coliseo')
    expect(botonAnadir()).toHaveProperty('disabled', false)
  })

  it('sin fechas en el viaje exige elegir la fecha', async () => {
    const user = userEvent.setup()
    simularBackend({ fecha_inicio: null, fecha_fin: null })
    renderizar()

    await user.type(await screen.findByLabelText('Nombre de la actividad'), 'Coliseo')
    expect(botonAnadir()).toHaveProperty('disabled', true)
    await user.type(screen.getByLabelText('Fecha'), '2027-06-01')
    expect(botonAnadir()).toHaveProperty('disabled', false)
  })

  it('envía la actividad con el día elegido y avisa al guardarla', async () => {
    const user = userEvent.setup()
    const onGuardada = vi.fn()
    const fetchMock = simularBackend()
    renderizar({ onGuardada })

    await user.click(await screen.findByRole('button', { name: 'Día 2 · 13 may' }))
    await user.type(screen.getByLabelText('Nombre de la actividad'), '  Visita al Coliseo ')
    await user.type(screen.getByLabelText('Lugar / Dirección'), 'Piazza del Colosseo')
    await user.type(screen.getByLabelText('Hora'), '10:00')
    await user.click(botonAnadir())

    await waitFor(() => expect(onGuardada).toHaveBeenCalledTimes(1))
    expect(cuerpoDelPost(fetchMock)).toEqual({
      titulo: 'Visita al Coliseo',
      fecha: '2027-05-13',
      hora_inicio: '10:00',
      ubicacion_nombre: 'Piazza del Colosseo',
    })
  })

  it('envía la hora y la ubicación como null si se dejan vacías', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizar()

    await user.type(await screen.findByLabelText('Nombre de la actividad'), 'Paseo')
    await user.click(botonAnadir())

    await waitFor(() => expect(cuerpoDelPost(fetchMock)).toBeDefined())
    expect(cuerpoDelPost(fetchMock)).toEqual({
      titulo: 'Paseo',
      fecha: '2027-05-12',
      hora_inicio: null,
      ubicacion_nombre: null,
    })
  })

  it('muestra el error del backend y no avisa de que se ha guardado', async () => {
    const user = userEvent.setup()
    const onGuardada = vi.fn()
    simularBackend({}, () =>
      respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' } }),
    )
    renderizar({ onGuardada })

    await user.type(await screen.findByLabelText('Nombre de la actividad'), 'Paseo')
    await user.click(botonAnadir())

    expect((await screen.findByRole('alert')).textContent).toBe('El viaje está cerrado y ya no se puede modificar')
    expect(onGuardada).not.toHaveBeenCalled()
    expect(botonAnadir()).toHaveProperty('disabled', false)
  })

  it('no ofrece el formulario si el viaje está archivado', async () => {
    simularBackend({ estado: 'archivado' })
    renderizar()

    expect((await screen.findByRole('alert')).textContent).toBe(
      'El viaje está cerrado y ya no se pueden añadir actividades',
    )
    expect(screen.queryByLabelText('Nombre de la actividad')).toBeNull()
  })

  it('avisa si no se ha podido cargar el viaje', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => respuesta(404, { error: { codigo: 'viaje_no_encontrado', mensaje: 'El viaje no existe o no perteneces a él' } })),
    )
    renderizar()

    expect((await screen.findByRole('alert')).textContent).toContain('El viaje no existe o no perteneces a él')
  })

  it('el botón de volver avisa a la ruta', async () => {
    const user = userEvent.setup()
    const onVolver = vi.fn()
    simularBackend()
    renderizar({ onVolver })

    await user.click(await screen.findByRole('button', { name: 'Volver' }))

    expect(onVolver).toHaveBeenCalledTimes(1)
  })
})
