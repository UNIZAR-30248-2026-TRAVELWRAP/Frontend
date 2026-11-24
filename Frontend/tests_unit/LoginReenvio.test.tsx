import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../src/screens/Login'

afterEach(() => {
  cleanup()
})

const reenviar = () => screen.queryByRole('button', { name: 'Reenviar correo de confirmación' })

describe('Login · reenviar correo de confirmación', () => {
  it('muestra el botón junto al error cuando se puede reenviar', () => {
    render(<Login error="El email no está confirmado" onReenviarConfirmacion={vi.fn()} />)

    expect(screen.getByRole('alert').textContent).toContain('El email no está confirmado')
    expect(reenviar()).toBeTruthy()
  })

  it('no muestra el botón si no se puede reenviar', () => {
    render(<Login error="Email o contraseña incorrectos" />)
    expect(reenviar()).toBeNull()
  })

  it('no muestra el botón si no hay error', () => {
    render(<Login onReenviarConfirmacion={vi.fn()} />)
    expect(reenviar()).toBeNull()
  })

  it('llama a onReenviarConfirmacion al pulsarlo', async () => {
    const user = userEvent.setup()
    const onReenviarConfirmacion = vi.fn()
    render(<Login error="El email no está confirmado" onReenviarConfirmacion={onReenviarConfirmacion} />)

    await user.click(reenviar()!)

    expect(onReenviarConfirmacion).toHaveBeenCalledTimes(1)
  })



})

