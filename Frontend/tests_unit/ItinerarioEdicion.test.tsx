import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Itinerario from '../src/screens/Itinerario'
import { guardarItinerario, leerItinerario } from '../src/services/itinerarioGuardado'

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo?: unknown) =>
  Promise.resolve(
    cuerpo === undefined
      ? new Response(null, { status: estado })
      : new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }),
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

const actividad = (id: string, datos: Record<string, unknown> = {}) => ({
  id,
  viaje_id: VIAJE_ID,
  titulo: `Actividad ${id}`,
  descripcion: null,
  fecha: '2027-05-12',
  hora_inicio: null,
  hora_fin: null,
  orden: 0,
  ubicacion_nombre: null,
  latitud: null,
  longitud: null,
  lugar_externo_id: null,
  categoria: null,
  creado_por: null as string | null,
  creado_en: '2026-10-24T10:00:00Z',
  actualizado_en: '2026-10-24T10:00:00Z',
  ...datos,
})

const ACTIVIDADES = [
  actividad('coliseo', { titulo: 'Visita al Coliseo', hora_inicio: '10:00:00' }),
  actividad('paseo', { titulo: 'Paseo sin hora' }),
]

type Borrado = (url: string) => Promise<Response>

const simularBackend = (
  datos: Record<string, unknown> = {},
  actividades: unknown[] = ACTIVIDADES,
  borrado: Borrado = () => respuesta(204),
) => {
  const fetchMock = vi.fn((url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'DELETE') return borrado(url)
    return url.includes('/actividades') ? respuesta(200, { actividades }) : respuesta(200, viaje(datos))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const llamadasDelete = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.filter(([, opciones]) => (opciones as RequestInit | undefined)?.method === 'DELETE') as unknown as [
    string,
    RequestInit & { headers: Record<string, string> },
  ][]

const renderizar = (props: Partial<Parameters<typeof Itinerario>[0]> = {}) =>
  render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" {...props} />)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Itinerario · editar y eliminar actividades', () => {
  it('cada actividad tiene su botón de editar y de eliminar con el título en el nombre', async () => {
    simularBackend()
    renderizar()

    await screen.findByText('Visita al Coliseo')

    expect(screen.getByRole('button', { name: 'Editar Visita al Coliseo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Eliminar Visita al Coliseo' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Editar Paseo sin hora' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Eliminar Paseo sin hora' })).toBeTruthy()
  })

  it('en un viaje archivado no se puede editar ni eliminar', async () => {
    simularBackend({ estado: 'archivado' })
    renderizar()

    await screen.findByText('Visita al Coliseo')

    expect(screen.queryByRole('button', { name: /^Editar / })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Eliminar / })).toBeNull()
  })

  it('sin conexión se ve lo guardado pero no se puede editar ni eliminar', async () => {
    guardarItinerario(VIAJE_ID, {
      viaje: viaje() as never,
      actividades: ACTIVIDADES as never,
      guardadoEn: '2026-10-25T10:30:00.000Z',
    })
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    renderizar()

    await screen.findByText('Visita al Coliseo')

    expect(screen.queryByRole('button', { name: /^Editar / })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Eliminar / })).toBeNull()
  })

  it('al pulsar editar avisa a la ruta con esa actividad', async () => {
    const user = userEvent.setup()
    const onEditarActividad = vi.fn()
    simularBackend()
    renderizar({ onEditarActividad })

    await user.click(await screen.findByRole('button', { name: 'Editar Visita al Coliseo' }))

    expect(onEditarActividad).toHaveBeenCalledTimes(1)
    expect(onEditarActividad.mock.calls[0][0]).toMatchObject({ id: 'coliseo', titulo: 'Visita al Coliseo' })
  })

  it('al pulsar eliminar pide confirmación con el nombre de la actividad', async () => {
    const user = userEvent.setup()
    simularBackend()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Eliminar Visita al Coliseo' }))

    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByText('¿Eliminar esta actividad?')).toBeTruthy()
    expect(dialogo.textContent).toContain('Visita al Coliseo')
    expect(dialogo.textContent).toContain('Esta acción no se puede deshacer')
  })

  it('cancelar cierra el diálogo sin eliminar nada', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Eliminar Visita al Coliseo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByText('Visita al Coliseo')).toBeTruthy()
    expect(llamadasDelete(fetchMock)).toHaveLength(0)
  })

  it('confirmar elimina la actividad en el servidor, la quita de la agenda y actualiza lo guardado', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Eliminar Visita al Coliseo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.queryByText('Visita al Coliseo')).toBeNull()
    expect(screen.getByText('Paseo sin hora')).toBeTruthy()
    const [url, opciones] = llamadasDelete(fetchMock)[0]
    expect(url).toMatch(new RegExp(`/viajes/${VIAJE_ID}/actividades/coliseo$`))
    expect(opciones.headers.Authorization).toBe('Bearer token-acceso')
    expect(leerItinerario(VIAJE_ID)?.actividades.map((a) => a.id)).toEqual(['paseo'])
  })

  it('al eliminar la última actividad del día lo indica', async () => {
    const user = userEvent.setup()
    simularBackend({}, [actividad('unica', { titulo: 'Única actividad' })])
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Eliminar Única actividad' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    expect(await screen.findByText('No hay actividades este día.')).toBeTruthy()
  })

  it('mientras se elimina, los botones del diálogo quedan bloqueados', async () => {
    const user = userEvent.setup()
    let terminar: (respuestaFinal: Response) => void = () => undefined
    simularBackend({}, ACTIVIDADES, () => new Promise<Response>((resolver) => (terminar = resolver)))
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Eliminar Visita al Coliseo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByRole('button', { name: 'Eliminando...' })).toHaveProperty('disabled', true)
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toHaveProperty('disabled', true)
    terminar(new Response(null, { status: 204 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('si el servidor rechaza el borrado muestra el error y la actividad sigue en la agenda', async () => {
    const user = userEvent.setup()
    simularBackend({}, ACTIVIDADES, () =>
      respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está cerrado y ya no se puede modificar' } }),
    )
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Eliminar Visita al Coliseo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    const dialogo = await screen.findByRole('dialog')
    expect((await within(dialogo).findByRole('alert')).textContent).toBe('El viaje está cerrado y ya no se puede modificar')
    expect(within(dialogo).getByRole('button', { name: 'Eliminar actividad' })).toHaveProperty('disabled', false)
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Visita al Coliseo')).toBeTruthy()
    expect(leerItinerario(VIAJE_ID)?.actividades).toHaveLength(2)
  })

  it('si falla la conexión al eliminar lo avisa en el diálogo', async () => {
    const user = userEvent.setup()
    simularBackend({}, ACTIVIDADES, () => Promise.reject(new TypeError('Failed to fetch')))
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Eliminar Visita al Coliseo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    expect((await screen.findByRole('dialog')).textContent).toContain('No se puede conectar con el servidor')
    expect(within(screen.getByRole('list', { name: 'Agenda del día' })).getByText('Visita al Coliseo')).toBeTruthy()
  })

  it('el error de un borrado anterior no aparece al abrir el diálogo de otra actividad', async () => {
    const user = userEvent.setup()
    simularBackend({}, ACTIVIDADES, () =>
      respuesta(502, { error: { codigo: 'error_actividad', mensaje: 'No se ha podido eliminar la actividad' } }),
    )
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Eliminar Visita al Coliseo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))
    await within(await screen.findByRole('dialog')).findByRole('alert')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Eliminar Paseo sin hora' }))

    expect(within(screen.getByRole('dialog')).queryByRole('alert')).toBeNull()
  })
})
