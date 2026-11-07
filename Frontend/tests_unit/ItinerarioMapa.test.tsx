import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Itinerario from '../src/screens/Itinerario'

vi.mock('../src/components/MapaActividades', () => ({
  default: ({ puntos }: { puntos: { id: string; titulo: string }[] }) => (
    <div data-testid="mapa">{puntos.map((punto) => punto.titulo).join('|')}</div>
  ),
}))

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

const conUbicacion = (id: string, titulo: string, datos: Record<string, unknown> = {}) =>
  actividad(id, { titulo, ubicacion_nombre: 'Roma', latitud: 41.89, longitud: 12.49, ...datos })

const simularBackend = (actividades: unknown[], datosViaje: Record<string, unknown> = {}) => {
  let vigentes = actividades as { id: string }[]
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, opciones?: RequestInit) => {
      if (opciones?.method === 'DELETE') {
        vigentes = vigentes.filter((actividad) => actividad.id !== url.split('/').pop())
        return new Response(null, { status: 204 })
      }
      return url.includes('/actividades') ? respuesta(200, { actividades: vigentes }) : respuesta(200, viaje(datosViaje))
    }),
  )
}

const renderizar = () => render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Itinerario · mapa', () => {
  it('muestra el mapa solo con las actividades del día que tienen ubicación, en el orden de la agenda', async () => {
    simularBackend([
      conUbicacion('a1', 'Desayuno', { hora_inicio: '08:30:00' }),
      actividad('a2', { titulo: 'Paseo sin lugar', hora_inicio: '09:30:00' }),
      conUbicacion('a3', 'Coliseo', { hora_inicio: '10:00:00' }),
      conUbicacion('a4', 'Vaticano', { fecha: '2027-05-13' }),
    ])
    renderizar()

    expect((await screen.findByTestId('mapa')).textContent).toBe('Desayuno|Coliseo')
  })

  it('indica cuántas actividades del día están en el mapa', async () => {
    simularBackend([conUbicacion('a1', 'Coliseo'), actividad('a2', { titulo: 'Paseo sin lugar' })])
    renderizar()

    expect(await screen.findByText('1 de 2 actividades con ubicación en el mapa')).toBeTruthy()
  })

  it('usa el singular cuando el día tiene una sola actividad', async () => {
    simularBackend([conUbicacion('a1', 'Coliseo')])
    renderizar()

    expect(await screen.findByText('1 de 1 actividad con ubicación en el mapa')).toBeTruthy()
  })

  it('si ninguna actividad del día tiene ubicación sigue enseñando el mapa y lo explica', async () => {
    simularBackend([actividad('a1', { titulo: 'Paseo', ubicacion_nombre: 'Trastevere' })])
    renderizar()

    expect((await screen.findByTestId('mapa')).textContent).toBe('')
    expect(screen.getByText(/Ninguna actividad de este día tiene ubicación en el mapa/)).toBeTruthy()
  })

  it('un día sin actividades también enseña el mapa, vacío, con el aviso', async () => {
    simularBackend([conUbicacion('a1', 'Coliseo')])
    renderizar()
    await screen.findByText('1 de 1 actividad con ubicación en el mapa')

    await userEvent.click(screen.getByRole('button', { name: 'Día 3 · 14 may' }))

    expect(screen.getByTestId('mapa').textContent).toBe('')
    expect(screen.getByText(/Ninguna actividad de este día tiene ubicación en el mapa/)).toBeTruthy()
    expect(screen.getByText('No hay actividades este día.')).toBeTruthy()
  })

  it('al cambiar de día el mapa pasa a mostrar las actividades de ese día', async () => {
    simularBackend([
      conUbicacion('a1', 'Coliseo'),
      conUbicacion('a2', 'Vaticano', { fecha: '2027-05-13' }),
      conUbicacion('a3', 'Trastevere', { fecha: '2027-05-13', hora_inicio: '20:00:00' }),
    ])
    renderizar()
    expect((await screen.findByTestId('mapa')).textContent).toBe('Coliseo')

    await userEvent.click(screen.getByRole('button', { name: 'Día 2 · 13 may' }))

    expect(screen.getByTestId('mapa').textContent).toBe('Vaticano|Trastevere')
    expect(screen.getByText('2 de 2 actividades con ubicación en el mapa')).toBeTruthy()
  })

  it('al eliminar una actividad desaparece su marcador del mapa y se actualiza el recuento', async () => {
    const user = userEvent.setup()
    simularBackend([conUbicacion('a1', 'Coliseo', { hora_inicio: '10:00:00' }), conUbicacion('a2', 'Foro', { hora_inicio: '12:00:00' })])
    renderizar()
    expect((await screen.findByTestId('mapa')).textContent).toBe('Coliseo|Foro')

    await user.click(screen.getByRole('button', { name: 'Eliminar Coliseo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    await waitFor(() => expect(screen.getByTestId('mapa').textContent).toBe('Foro'))
    expect(screen.getByText('1 de 1 actividad con ubicación en el mapa')).toBeTruthy()
  })

  it('al eliminar la última actividad con ubicación el mapa se queda sin marcadores', async () => {
    const user = userEvent.setup()
    simularBackend([conUbicacion('a1', 'Coliseo')])
    renderizar()
    await screen.findByText('1 de 1 actividad con ubicación en el mapa')

    await user.click(screen.getByRole('button', { name: 'Eliminar Coliseo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar actividad' }))

    await waitFor(() => expect(screen.getByTestId('mapa').textContent).toBe(''))
    expect(screen.getByText(/Ninguna actividad de este día tiene ubicación en el mapa/)).toBeTruthy()
  })

  it('en un viaje archivado el mapa también se ve', async () => {
    simularBackend([conUbicacion('a1', 'Coliseo')], { estado: 'archivado' })
    renderizar()

    expect((await screen.findByTestId('mapa')).textContent).toBe('Coliseo')
  })

  it('sin fechas ni actividades no hay días y no se enseña el mapa', async () => {
    simularBackend([], { fecha_inicio: null, fecha_fin: null })
    renderizar()

    await screen.findByText(/Todavía no hay actividades ni fechas en este viaje/)
    expect(screen.queryByTestId('mapa')).toBeNull()
  })
})
