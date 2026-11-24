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


  it('no muestra el botón si no hay error', () => {
    render(<Login onReenviarConfirmacion={vi.fn()} />)
    expect(reenviar()).toBeNull()
  })


  it('se desactiva mientras carga', () => {
    render(<Login error="El email no está confirmado" onReenviarConfirmacion={vi.fn()} loading />)
    expect(reenviar()).toHaveProperty('disabled', true)
  })

  it('muestra el aviso verde de que el correo se ha enviado', () => {
    render(<Login aviso="Te hemos enviado un nuevo correo de confirmación" />)
    expect(screen.getByRole('status').textContent).toBe('Te hemos enviado un nuevo correo de confirmación')
  })

})

describe('Login · enlace a Registro', () => {
  it('muestra «Regístrate» y navega solo si se puede', async () => {
    const user = userEvent.setup()
    const onIrARegistro = vi.fn()
    const { rerender } = render(<Login />)
    expect(screen.queryByRole('button', { name: 'Regístrate' })).toBeNull()

    rerender(<Login onIrARegistro={onIrARegistro} />)
    await user.click(screen.getByRole('button', { name: 'Regístrate' }))

    expect(onIrARegistro).toHaveBeenCalledTimes(1)
  })
})
