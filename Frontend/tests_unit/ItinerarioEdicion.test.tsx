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
  let vigentes = actividades as { id: string }[]
  const fetchMock = vi.fn(async (url: string, opciones?: RequestInit) => {
    if (opciones?.method === 'DELETE') {
      const resultado = await borrado(url)
      if (resultado.ok) vigentes = vigentes.filter((actividad) => actividad.id !== url.split('/').pop())
      return resultado
    }
    return url.includes('/actividades') ? respuesta(200, { actividades: vigentes }) : respuesta(200, viaje(datos))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}


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

  it('en un viaje finalizado no se puede editar ni eliminar', async () => {
    simularBackend({ estado: 'finalizado' })
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



  it('tras eliminar vuelve a pedir el viaje y las actividades al servidor para recargar la agenda', async () => {
    const user = userEvent.setup()
    const fetchMock = simularBackend()
    renderizar()
    await user.click(await screen.findByRole('button', { name: 'Eliminar Visita al Coliseo' }))
    const peticionesAntes = fetchMock.mock.calls.length

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    await waitFor(() => expect(screen.queryByText('Visita al Coliseo')).toBeNull())
    await waitFor(() => {
      const despues = fetchMock.mock.calls.slice(peticionesAntes).map(([url]) => String(url))
      expect(despues.filter((url) => url.endsWith('/actividades')).length).toBe(1)
      expect(despues.filter((url) => url.endsWith(`/viajes/${VIAJE_ID}`)).length).toBe(1)
    })
    expect(screen.getByText('Paseo sin hora')).toBeTruthy()
  })




  it('si el servidor rechaza el borrado muestra el error y la actividad sigue en la agenda', async () => {
    const user = userEvent.setup()
    simularBackend({}, ACTIVIDADES, () =>
      respuesta(409, { error: { codigo: 'viaje_no_activo', mensaje: 'El viaje está finalizado y ya no se puede modificar' } }),
    )
    renderizar()

    await user.click(await screen.findByRole('button', { name: 'Eliminar Visita al Coliseo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    const dialogo = await screen.findByRole('dialog')
    expect((await within(dialogo).findByRole('alert')).textContent).toBe('El viaje está finalizado y ya no se puede modificar')
    expect(within(dialogo).getByRole('button', { name: 'Eliminar actividad' })).toHaveProperty('disabled', false)
    await user.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Visita al Coliseo')).toBeTruthy()
    expect(leerItinerario(VIAJE_ID)?.actividades).toHaveLength(2)
  })


})
