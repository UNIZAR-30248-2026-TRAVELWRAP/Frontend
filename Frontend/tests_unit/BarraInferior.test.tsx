import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BarraInferior from '../src/components/BarraInferior'

afterEach(() => {
  cleanup()
})

describe('BarraInferior', () => {
  it('muestra las cinco secciones del viaje en el orden del prototipo', () => {
    render(<BarraInferior activa="inicio" />)

    const barra = screen.getByRole('navigation', { name: 'Secciones del viaje' })
    const textos = within(barra).getAllByRole('button').map((b) => b.textContent)
    expect(textos).toEqual(['Gastos', 'Itinerario', 'Inicio', 'Agenda', 'Más'])
  })

  it('marca la sección activa', () => {
    render(<BarraInferior activa="inicio" />)

    expect(screen.getByRole('button', { name: 'Inicio' }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: 'Gastos' }).getAttribute('aria-current')).toBeNull()
  })

  it('deja activa la sección Más (chat y galería) y avisa al pulsarla', async () => {
    const user = userEvent.setup()
    const onCambiar = vi.fn()
    render(<BarraInferior activa="inicio" onCambiar={onCambiar} />)

    const boton = screen.getByRole('button', { name: 'Más' })
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
