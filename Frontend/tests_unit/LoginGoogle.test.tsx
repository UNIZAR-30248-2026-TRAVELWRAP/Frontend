import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../src/screens/Login'

afterEach(() => {
  cleanup()
})

const botonGoogle = () => screen.getByRole('button', { name: /continuar con google/i })

describe('Login · botón Continuar con Google', () => {
  it('muestra el botón de Google', () => {
    render(<Login />)
    expect(botonGoogle()).toBeTruthy()
  })



  it('no envía el formulario de email al pulsarlo', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} onGoogleLogin={vi.fn()} />)

    await user.type(screen.getByLabelText('Email'), 'daniel@travelwrap.app')
    await user.type(screen.getByLabelText('Contraseña'), 'secreta123')
    await user.click(botonGoogle())

    expect(onLogin).not.toHaveBeenCalled()
  })

  it('se desactiva mientras se está iniciando sesión', () => {
    render(<Login loading />)
    expect(botonGoogle()).toHaveProperty('disabled', true)
  })
})
