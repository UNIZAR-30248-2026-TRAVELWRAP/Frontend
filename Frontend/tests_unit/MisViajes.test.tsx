import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
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
  rol: 'creador',
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

  it('pinta los viajes reales: activos en azul, pendientes en verde y finalizados como anteriores', async () => {
    conViajes([
      viaje('azul', { nombre: 'Lisboa 2027' }),
      viaje('verde', { nombre: 'Verano 2027', destino: null, pendiente_destino: true }),
      viaje('fin', { nombre: 'Praga 2025', estado: 'finalizado', fecha_inicio: '2025-06-20', fecha_fin: '2025-06-24' }),
      viaje('arch', { nombre: 'Archivado 2024', estado: 'archivado' }),
    ])

    render(<MisViajes tokenSesion="token-acceso" mostrarEjemplos={false} />)

    const azul = await screen.findByRole('button', { name: /Lisboa 2027/ })
    expect(azul.textContent).toContain('En curso')
    expect(azul.textContent).toContain('12 – 15 may · 4 días')
    expect(azul.textContent).toContain('PRESUPUESTO')
    expect(azul.textContent).toContain('1.240 €')
    expect(azul.textContent).toContain('DB')

    const verde = screen.getByRole('button', { name: /Verano 2027/ })
    expect(verde.textContent).toContain('Pendiente de destino')

    const anterior = screen.getByRole('button', { name: /Praga 2025/ })
    expect(anterior.textContent).toContain('20–24 jun 2025')
    expect(anterior.textContent).toContain('2 viajeros')

    expect(screen.queryByText('Archivado 2024')).toBeNull()
    expect(screen.getByText('Viajes activos')).toBeTruthy()
  })

  it('mantiene los viajes de ejemplo junto a los reales mientras se desarrolla', async () => {
    conViajes([viaje('azul', { nombre: 'Lisboa 2027' })])

    render(<MisViajes tokenSesion="token-acceso" />)

    expect(await screen.findByRole('button', { name: /Lisboa 2027/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Roma 2025/ })).toBeTruthy()
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
