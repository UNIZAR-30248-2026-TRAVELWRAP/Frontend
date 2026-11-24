import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MisViajes from '../src/screens/MisViajes'

const respuesta = (estado: number, cuerpo: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: { 'Content-Type': 'application/json' },
    }),
  )

const viaje = (id: string, datos: Record<string, unknown> = {}) => ({
  id,
  nombre: `Viaje ${id}`,
  destino: 'Roma',
  descripcion: null,
  fecha_inicio: '2027-05-12',
  fecha_fin: '2027-05-15',
  moneda: 'EUR',
  presupuesto: 1240,
  estado: 'activo',
  creado_en: '2026-10-12T10:00:00Z',
  pendiente_destino: false,
  portada_url: null,
  rol: 'creador',
  archivado: false,
  miembros: [
    { usuario_id: 'u1', nombre: 'Daniel', avatar_url: null, rol: 'creador' },
    { usuario_id: 'u2', nombre: 'Berta', avatar_url: null, rol: 'miembro' },
  ],
  ...datos,
})

const conViajes = (viajes: unknown[]) => vi.stubGlobal('fetch', vi.fn(() => respuesta(200, { viajes })))

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('MisViajes', () => {
  it('saluda al usuario y muestra los viajes de ejemplo sin llamar al backend si no hay sesión', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<MisViajes nombreUsuario="Berta" emailUsuario="berta@travelwrap.app" />)

    expect(screen.getByText('Hola, Berta')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Perfil de berta@travelwrap.app' }).textContent).toBe('B')
    expect(screen.getByRole('button', { name: /Roma 2025/ }).textContent).toContain('PRESUPUESTO')
    expect(screen.getByRole('button', { name: /Paris 2024/ })).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })


  it('muestra la portada de fondo en la tarjeta del viaje activo y deja las demás como siempre', async () => {
    const portada = 'https://storage.test/portadas/roma.jpg?token=abc'
    conViajes([
      viaje('con', { nombre: 'Roma 2027', portada_url: portada }),
      viaje('sin', { nombre: 'Lisboa 2027' }),
      viaje('fin', { nombre: 'Praga 2025', estado: 'finalizado', portada_url: portada }),
    ])

    render(<MisViajes tokenSesion="token-acceso" mostrarEjemplos={false} />)

    const conPortada = await screen.findByRole('button', { name: /Roma 2027/ })
    const fondo = within(conPortada).getByTestId('fondo-portada')
    expect(fondo.getAttribute('src')).toBe(portada)
    expect(fondo.getAttribute('alt')).toBe('')
    expect(fondo.getAttribute('aria-hidden')).toBe('true')
    expect(within(screen.getByRole('button', { name: /Lisboa 2027/ })).queryByTestId('fondo-portada')).toBeNull()
    expect(screen.getAllByTestId('fondo-portada')).toHaveLength(1)
  })

  it('pide los viajes sin filtros: el servidor ya deja fuera los que el usuario ha archivado', async () => {
    conViajes([viaje('azul', { nombre: 'Lisboa 2027' })])

    render(<MisViajes tokenSesion="token-acceso" mostrarEjemplos={false} />)

    await screen.findByRole('button', { name: /Lisboa 2027/ })
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toMatch(/\/viajes$/)
  })


  it('muestra el estado vacío si el usuario no tiene viajes', async () => {
    conViajes([])

    render(<MisViajes tokenSesion="token-acceso" mostrarEjemplos={false} />)

    expect(await screen.findByText('Aún no tienes viajes')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Crear nuevo viaje' })).toBeTruthy()
  })

  it('avisa si no se pueden cargar los viajes', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))

    render(<MisViajes tokenSesion="token-acceso" mostrarEjemplos={false} />)

    expect((await screen.findByRole('alert')).textContent).toContain('No se puede conectar con el servidor')
    expect(screen.queryByText('Aún no tienes viajes')).toBeNull()
  })

  it('avisa de qué viaje se ha pulsado, de crear viaje y de abrir el perfil', async () => {
    const user = userEvent.setup()
    conViajes([viaje('verde', { nombre: 'Verano 2027', destino: null, pendiente_destino: true })])
    const avisos = { onSelectTrip: vi.fn(), onSelectPendingTrip: vi.fn(), onViewPastTrip: vi.fn(), onCreateTrip: vi.fn(), onViewPerfil: vi.fn() }
    render(<MisViajes tokenSesion="token-acceso" {...avisos} />)

    await user.click(await screen.findByRole('button', { name: /Verano 2027/ }))
    await user.click(screen.getByRole('button', { name: /Roma 2025/ }))
    await user.click(screen.getByRole('button', { name: /Lisboa 2023/ }))
    await user.click(screen.getByRole('button', { name: 'Crear nuevo viaje' }))
    await user.click(screen.getByRole('button', { name: 'Perfil de Adriana' }))

    expect(avisos.onSelectPendingTrip).toHaveBeenCalledWith('verde')
    expect(avisos.onSelectTrip).toHaveBeenCalledWith('roma-2025')
    expect(avisos.onViewPastTrip).toHaveBeenCalledWith('lisboa-2023')
    expect(avisos.onCreateTrip).toHaveBeenCalledTimes(1)
    expect(avisos.onViewPerfil).toHaveBeenCalledTimes(1)
  })
})
