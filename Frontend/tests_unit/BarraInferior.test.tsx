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
    expect(textos).toEqual(['Gastos', 'Itinerario', 'Inicio', 'Gestión', 'Chat'])
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

    const boton = screen.getByRole('button', { name: 'Gestión' })
    expect(boton).toHaveProperty('disabled', false)
    await user.click(boton)

    expect(onCambiar).toHaveBeenCalledWith('agenda')
  })



})

describe('BarraInferior · mensajes nuevos del chat', () => {
  afterEach(() => {
    vi.mocked(useMensajesNoLeidos).mockReturnValue(0)
  })



  it('sin mensajes nuevos no muestra ningún contador', () => {
    render(<BarraInferior activa="inicio" />)

    expect(screen.getByRole('navigation', { name: 'Secciones del viaje' }).textContent).not.toMatch(/\d/)
  })
})
