import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Itinerario from '../src/screens/Itinerario'

vi.mock('../src/components/MapaActividades', () => ({
  default: () => <div data-testid="mapa-actividades" />,
}))

vi.mock('../src/components/MapaPuntosInteres', () => ({
  default: ({ puntos }: { puntos: { nombre: string }[] }) => <div data-testid="mapa-puntos">{puntos.map((p) => p.nombre).join('|')}</div>,
}))

configure({ asyncUtilTimeout: 5000 })

const VIAJE_ID = '123e4567-e89b-12d3-a456-426614174000'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } }))

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

const PUNTO = {
  id: 'p1',
  viaje_id: VIAJE_ID,
  nombre: 'Fontana di Trevi',
  nota: null,
  categoria: 'cultura',
  latitud: 41.9,
  longitud: 12.48,
  lugar_externo_id: null,
  direccion: null,
  creado_por: 'u1',
  creado_en: '2026-11-22T10:00:00Z',
}

const simularBackend = (datosViaje: Record<string, unknown> = {}, actividades: unknown[] = []) => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes('/puntos-de-interes')) return respuesta(200, { puntos_interes: [PUNTO] })
    if (url.includes('/actividades')) return respuesta(200, { actividades })
    return respuesta(200, viaje(datosViaje))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const llamadasAPuntos = (fetchMock: ReturnType<typeof vi.fn>) =>
  fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes('/puntos-de-interes'))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('Itinerario · pestaña de puntos de interés', () => {
  it('empieza en la agenda y no pide los puntos hasta abrir la pestaña', async () => {
    const fetchMock = simularBackend()
    render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" />)

    expect(await screen.findByText('Agenda del día')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Agenda', selected: true })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Puntos de interés', selected: false })).toBeTruthy()
    expect(llamadasAPuntos(fetchMock)).toHaveLength(0)
  })

  it('al cambiar a puntos de interés se ve su mapa y lista, y desaparece la agenda', async () => {
    const fetchMock = simularBackend()
    render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('Agenda del día')

    await userEvent.click(screen.getByRole('tab', { name: 'Puntos de interés' }))

    expect((await screen.findByTestId('mapa-puntos')).textContent).toBe('Fontana di Trevi')
    expect(screen.getByRole('tab', { name: 'Puntos de interés', selected: true })).toBeTruthy()
    expect(screen.queryByText('Agenda del día')).toBeNull()
    expect(screen.queryByTestId('mapa-actividades')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Añadir Actividad' })).toBeNull()
    expect(llamadasAPuntos(fetchMock)).toHaveLength(1)
  })

  it('conserva el hueco de los botones de día para que la cabecera no cambie de tamaño', async () => {
    simularBackend()
    render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('Agenda del día')
    expect(screen.getByRole('group', { name: 'Día del itinerario' })).toBeTruthy()

    await userEvent.click(screen.getByRole('tab', { name: 'Puntos de interés' }))

    expect(screen.queryByRole('group', { name: 'Día del itinerario' })).toBeNull()
    const oculto = document.querySelector('[aria-hidden="true"][style*="visibility: hidden"]')
    expect(oculto).not.toBeNull()
    expect(oculto?.textContent).toContain('Día 1')
  })

  it('al volver a la agenda se ve como estaba', async () => {
    simularBackend()
    render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('Agenda del día')
    await userEvent.click(screen.getByRole('tab', { name: 'Puntos de interés' }))
    await screen.findByTestId('mapa-puntos')

    await userEvent.click(screen.getByRole('tab', { name: 'Agenda' }))

    expect(await screen.findByText('Agenda del día')).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Día del itinerario' })).toBeTruthy()
    expect(screen.queryByTestId('mapa-puntos')).toBeNull()
  })

  it('con el viaje finalizado los puntos son de solo lectura', async () => {
    simularBackend({ estado: 'finalizado' })
    render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" />)
    await screen.findByText('Agenda del día')

    await userEvent.click(screen.getByRole('tab', { name: 'Puntos de interés' }))

    await screen.findByTestId('mapa-puntos')
    await waitFor(() => expect(screen.getByText('Puntos de interés (1)')).toBeTruthy())
    expect(screen.queryByLabelText('Buscar una dirección')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Eliminar Fontana di Trevi' })).toBeNull()
  })

  it('con el viaje activo permite buscar direcciones usando la función que recibe', async () => {
    simularBackend()
    const buscar = vi.fn(async () => [])
    render(<Itinerario viajeId={VIAJE_ID} tokenSesion="token-acceso" onBuscarDirecciones={buscar} />)
    await screen.findByText('Agenda del día')
    await userEvent.click(screen.getByRole('tab', { name: 'Puntos de interés' }))

    await userEvent.type(await screen.findByLabelText('Buscar una dirección'), 'Roma')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar dirección' }))

    expect(buscar).toHaveBeenCalledWith('Roma')
  })
})
