import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MisViajes from '../src/screens/MisViajes'

afterEach(() => {
  cleanup()
})

describe('MisViajes', () => {
  it('saluda al usuario y muestra el título de la pantalla', () => {
    render(<MisViajes nombreUsuario="Berta" emailUsuario="berta@travelwrap.app" />)

    expect(screen.getByText('Hola, Berta')).toBeTruthy()
    expect(screen.getByText('Mis Viajes')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Perfil de berta@travelwrap.app' }).textContent).toBe('B')
  })

  it('muestra el viaje activo con sus fechas, miembros y gasto', () => {
    render(<MisViajes />)

    const tarjeta = screen.getByRole('button', { name: /Roma 2025/ })
    expect(tarjeta.textContent).toContain('En curso')
    expect(tarjeta.textContent).toContain('12 – 15 Mayo · 3 días')
    expect(tarjeta.textContent).toContain('623 €')
    expect(tarjeta.textContent).toContain('DBA')
  })

  it('lista los viajes anteriores con viajeros y gasto', () => {
    render(<MisViajes />)

    expect(screen.getByText('Viajes anteriores')).toBeTruthy()
    const paris = screen.getByRole('button', { name: /Paris 2024/ })
    expect(paris.textContent).toContain('20–24 Jun 2024')
    expect(paris.textContent).toContain('4 viajeros')
    expect(paris.textContent).toContain('1.240 €')
    expect(screen.getByRole('button', { name: /Lisboa 2023/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Amsterdam 2022/ })).toBeTruthy()
  })

  it('avisa de qué viaje se ha pulsado, de crear viaje y de abrir el perfil', async () => {
    const user = userEvent.setup()
    const onSelectTrip = vi.fn()
    const onViewPastTrip = vi.fn()
    const onCreateTrip = vi.fn()
    const onViewPerfil = vi.fn()
    render(
      <MisViajes
        onSelectTrip={onSelectTrip}
        onViewPastTrip={onViewPastTrip}
        onCreateTrip={onCreateTrip}
        onViewPerfil={onViewPerfil}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Roma 2025/ }))
    await user.click(screen.getByRole('button', { name: /Lisboa 2023/ }))
    await user.click(screen.getByRole('button', { name: 'Crear nuevo viaje' }))
    await user.click(screen.getByRole('button', { name: 'Perfil de Adriana' }))

    expect(onSelectTrip).toHaveBeenCalledWith('roma-2025')
    expect(onViewPastTrip).toHaveBeenCalledWith('lisboa-2023')
    expect(onCreateTrip).toHaveBeenCalledTimes(1)
    expect(onViewPerfil).toHaveBeenCalledTimes(1)
  })

  it('muestra el viaje pendiente de destino solo si existe', async () => {
    const user = userEvent.setup()
    const onSelectPendingTrip = vi.fn()
    const { rerender } = render(<MisViajes />)
    expect(screen.queryByText('Pendiente de destino')).toBeNull()

    rerender(
      <MisViajes
        viajePendiente={{ id: 'verano-2027', nombre: 'Verano 2027' }}
        onSelectPendingTrip={onSelectPendingTrip}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Verano 2027/ }))

    expect(onSelectPendingTrip).toHaveBeenCalledWith('verano-2027')
  })

  it('sin viajes solo ofrece crear uno nuevo', () => {
    render(<MisViajes viajeActivo={null} viajesAnteriores={[]} />)

    expect(screen.queryByText('Viaje activo')).toBeNull()
    expect(screen.queryByText('Viajes anteriores')).toBeNull()
    expect(screen.getByRole('button', { name: 'Crear nuevo viaje' })).toBeTruthy()
  })
})
