import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Votaciones from '../src/screens/Votaciones'

const PREGUNTA_ABIERTA = '¿Qué fin de semana preferimos para el viaje a Roma?'

afterEach(() => {
  cleanup()
})

describe('Votaciones', () => {
  it('muestra la votación activa con sus opciones y la cerrada con su ganadora', () => {
    render(<Votaciones />)

    const abierta = screen.getByRole('region', { name: PREGUNTA_ABIERTA })
    expect(within(abierta).getByText('Votación activa')).toBeTruthy()
    expect(within(abierta).getAllByRole('radio')).toHaveLength(2)
    expect(within(abierta).getByText('2/3')).toBeTruthy()

    const cerrada = screen.getByRole('region', { name: '¿Qué tipo de alojamiento preferís?' })
    expect(cerrada.textContent).toContain('Ganó: Airbnb compartido')
  })

  it('filtra por tipo de votación', async () => {
    const user = userEvent.setup()
    render(<Votaciones />)

    await user.click(screen.getByRole('tab', { name: 'Fechas' }))
    expect(screen.getByRole('region', { name: PREGUNTA_ABIERTA })).toBeTruthy()
    expect(screen.queryByText('¿Qué tipo de alojamiento preferís?')).toBeNull()

    await user.click(screen.getByRole('tab', { name: 'Actividades' }))
    expect(screen.getByText('No hay votaciones de este tipo todavía.')).toBeTruthy()
  })

  it('al emitir el voto se suma a la opción elegida', async () => {
    const user = userEvent.setup()
    render(<Votaciones />)
    const abierta = screen.getByRole('region', { name: PREGUNTA_ABIERTA })

    expect(within(abierta).getByRole('button', { name: 'Emitir voto' })).toHaveProperty('disabled', true)
    await user.click(within(abierta).getByRole('radio', { name: /19 – 22 mayo/ }))
    await user.click(within(abierta).getByRole('button', { name: 'Emitir voto' }))

    expect(within(abierta).getByRole('button', { name: /Voto emitido/ })).toBeTruthy()
    expect(within(abierta).getByText('3/3')).toBeTruthy()
    expect(within(abierta).getByRole('radio', { name: /19 – 22 mayo/ }).textContent).toContain('Tu elección')
  })

  it('al cerrar la votación pasa a cerradas con la opción ganadora', async () => {
    const user = userEvent.setup()
    render(<Votaciones />)

    await user.click(screen.getByRole('button', { name: 'Cerrar votación' }))

    const cerrada = screen.getByRole('region', { name: PREGUNTA_ABIERTA })
    expect(cerrada.textContent).toContain('Cerrada')
    expect(cerrada.textContent).toContain('Ganó: 12 – 15 mayo')
  })

  it('el botón de crear y el de volver avisan a la ruta', async () => {
    const user = userEvent.setup()
    const onVolver = vi.fn()
    const onCrearVotacion = vi.fn()
    render(<Votaciones onVolver={onVolver} onCrearVotacion={onCrearVotacion} />)

    await user.click(screen.getByRole('button', { name: 'Crear nueva votación' }))
    await user.click(screen.getByRole('button', { name: 'Volver' }))

    expect(onCrearVotacion).toHaveBeenCalledTimes(1)
    expect(onVolver).toHaveBeenCalledTimes(1)
  })
})
