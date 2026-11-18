import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BarraInferior from '../src/components/BarraInferior'
import { useMensajesNoLeidos } from '../src/services/chatLeidos'

vi.mock('../src/services/chatLeidos', () => ({ useMensajesNoLeidos: vi.fn(() => 0) }))

afterEach(() => {
  cleanup()
})

describe('BarraInferior', () => {
  it('muestra las cinco secciones del viaje en el orden del prototipo', () => {
    render(<BarraInferior activa="inicio" />)

    const barra = screen.getByRole('navigation', { name: 'Secciones del viaje' })
    const textos = within(barra).getAllByRole('button').map((b) => b.textContent)
    expect(textos).toEqual(['Gastos', 'Itinerario', 'Inicio', 'Agenda', 'Chat'])
  })

  it('marca la sección activa', () => {
    render(<BarraInferior activa="inicio" />)

    expect(screen.getByRole('button', { name: 'Inicio' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Gastos' }).getAttribute('aria-current')).toBeNull()
  })

  it('deja activa la sección Chat (chat y galería) y avisa al pulsarla', async () => {
    const user = userEvent.setup()
    const onCambiar = vi.fn()
    render(<BarraInferior activa="inicio" onCambiar={onCambiar} />)

    const boton = screen.getByRole('button', { name: 'Chat' })
    expect(boton).toHaveProperty('disabled', false)
    await user.click(boton)

    expect(onCambiar).toHaveBeenCalledWith('mas')
  })

  it('deja activa la sección Agenda (cartera de documentos) y avisa al pulsarla', async () => {
    const user = userEvent.setup()
    const onCambiar = vi.fn()
    render(<BarraInferior activa="inicio" onCambiar={onCambiar} />)

    const boton = screen.getByRole('button', { name: 'Agenda' })
    expect(boton).toHaveProperty('disabled', false)
    await user.click(boton)

    expect(onCambiar).toHaveBeenCalledWith('agenda')
  })

  it('deja activa la sección Gastos y avisa al pulsarla', async () => {
    const user = userEvent.setup()
    const onCambiar = vi.fn()
    render(<BarraInferior activa="inicio" onCambiar={onCambiar} />)

    const boton = screen.getByRole('button', { name: 'Gastos' })
    expect(boton).toHaveProperty('disabled', false)
    await user.click(boton)

    expect(onCambiar).toHaveBeenCalledWith('gastos')
  })

  it('deja activa la sección Itinerario y avisa al pulsarla', async () => {
    const user = userEvent.setup()
    const onCambiar = vi.fn()
    render(<BarraInferior activa="inicio" onCambiar={onCambiar} />)

    const boton = screen.getByRole('button', { name: 'Itinerario' })
    expect(boton).toHaveProperty('disabled', false)
    await user.click(boton)

    expect(onCambiar).toHaveBeenCalledWith('itinerario')
  })

  it('no avisa al pulsar la sección en la que ya se está', async () => {
    const user = userEvent.setup()
    const onCambiar = vi.fn()
    render(<BarraInferior activa="inicio" onCambiar={onCambiar} />)

    await user.click(screen.getByRole('button', { name: 'Inicio' }))

    expect(onCambiar).not.toHaveBeenCalled()
  })
})

describe('BarraInferior · mensajes nuevos del chat', () => {
  afterEach(() => {
    vi.mocked(useMensajesNoLeidos).mockReturnValue(0)
  })

  it('muestra en la pestaña Chat cuántos mensajes nuevos hay', () => {
    vi.mocked(useMensajesNoLeidos).mockReturnValue(3)
    render(<BarraInferior activa="inicio" />)

    const barra = screen.getByRole('navigation', { name: 'Secciones del viaje' })
    expect(within(barra).getByRole('button', { name: 'Chat' }).textContent).toContain('3')
  })

  it('a partir de 9 mensajes muestra 9+', () => {
    vi.mocked(useMensajesNoLeidos).mockReturnValue(12)
    render(<BarraInferior activa="inicio" />)

    expect(screen.getByRole('navigation', { name: 'Secciones del viaje' }).textContent).toContain('9+')
  })

  it('sin mensajes nuevos no muestra ningún contador', () => {
    render(<BarraInferior activa="inicio" />)

    expect(screen.getByRole('navigation', { name: 'Secciones del viaje' }).textContent).not.toMatch(/\d/)
  })
})
