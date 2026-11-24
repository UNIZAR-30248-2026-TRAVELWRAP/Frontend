import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
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

  it('pinta los viajes reales: activos en azul, pendientes en verde y finalizados como anteriores', async () => {
    conViajes([
      viaje('azul', { nombre: 'Lisboa 2027' }),
      viaje('verde', { nombre: 'Verano 2027', destino: null, pendiente_destino: true }),
      viaje('fin', { nombre: 'Praga 2025', estado: 'finalizado', fecha_inicio: '2025-06-20', fecha_fin: '2025-06-24' }),
    ])

    render(<MisViajes tokenSesion="token-acceso" mostrarEjemplos={false} />)

    const azul = await screen.findByRole('button', { name: /Lisboa 2027/ })
    expect(azul.textContent).toMatch(/Próximo · faltan \d+ días/)
    expect(azul.textContent).toContain('12 – 15 may · 4 días')
    expect(azul.textContent).toContain('PRESUPUESTO')
    expect(azul.textContent).toContain('1.240 €')
    expect(azul.textContent).toContain('DB')

    const verde = screen.getByRole('button', { name: /Verano 2027/ })
    expect(verde.textContent).toContain('Pendiente de destino')

    const anterior = screen.getByRole('button', { name: /Praga 2025/ })
    expect(anterior.textContent).toContain('20–24 jun 2025')
    expect(anterior.textContent).toContain('2 viajeros')

    expect(screen.getByText('Viajes activos')).toBeTruthy()
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




})
